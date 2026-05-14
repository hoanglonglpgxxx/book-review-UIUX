"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";

type SessionUser = { userId: string; email: string; username: string };

type ShelfBook = {
  id: string;
  bookId: string;
  title: string;
  author: string;
  coverImageUrl: string;
  status: string;
  pageCount: number | null;
  currentPage: number | null;
  readingType: string;
  rating: number;
  comment: string;
  startDate: string | null;
  endDate: string | null;
};

type ActiveSession = {
  id: string;
  bookId: string;
  bookTitle: string;
  bookCover: string;
  reviewId: string;
  startedAt: string;
  startPage: number | null;
} | null;

const STATUS_TABS = [
  { key: "want_to_read", label: "Muốn đọc" },
  { key: "reading", label: "Đang đọc" },
  { key: "waiting_to_review", label: "Đã xong" },
  { key: "dropped", label: "Bỏ dở" },
] as const;

const STATUS_CSV: Record<string, string> = {
  waiting_to_review: "Finished",
  reading: "Reading/Listening",
  dropped: "Dropped",
  want_to_read: "'Bout to Start",
  not_started: "'Bout to Start",
};

function toStars(rating: number): string {
  return rating > 0 ? "⭐️".repeat(rating) : "";
}

function fmtStart(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function fmtEnd(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function csvCell(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function downloadCsv(filename: string, rows: string[][]): void {
  const content = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_FROM_CSV: Record<string, string> = {
  "Finished": "waiting_to_review",
  "Reading/Listening": "reading",
  "Dropped": "dropped",
  "'Bout to Start": "want_to_read",
};

function countStars(s: string): number {
  return (s.match(/⭐/g) ?? []).length;
}

function parseIso(s: string): string | undefined {
  if (!s.trim()) return undefined;
  const d = new Date(s.trim());
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field); field = ""; }
      else if (ch === '\n') { row.push(field); field = ""; rows.push(row); row = []; }
      else if (ch !== '\r') { field += ch; }
    }
  }
  row.push(field);
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

function exportCsv(books: ShelfBook[]): void {
  // Format 1: Type,Name,Status,Score /5,Author,EPUB/PDF/Audio,Sách Giấy,Summary,Start,End
  const rows1: string[][] = [
    ["Type", "Name", "Status", "Score /5", "Author", "EPUB/PDF/Audio", "Sách Giấy", "Summary", "Start", "End"],
    ...books.map((b) => [
      "",
      b.title,
      STATUS_CSV[b.status] ?? b.status,
      toStars(b.rating),
      b.author,
      b.readingType === "kindle" ? "Yes" : "No",
      b.readingType === "paper" ? "Yes" : "No",
      b.comment,
      fmtStart(b.startDate),
      fmtEnd(b.endDate),
    ]),
  ];

  // Format 2: Name,Author,EPUB/PDF/Audio,End,Score /5,Start,Status,Summary,Sách Giấy,Type
  const rows2: string[][] = [
    ["Name", "Author", "EPUB/PDF/Audio", "End", "Score /5", "Start", "Status", "Summary", "Sách Giấy", "Type"],
    ...books.map((b) => [
      b.title,
      b.author,
      b.readingType === "kindle" ? "Yes" : "No",
      fmtEnd(b.endDate),
      toStars(b.rating),
      fmtStart(b.startDate),
      STATUS_CSV[b.status] ?? b.status,
      b.comment,
      b.readingType === "paper" ? "Yes" : "No",
      "",
    ]),
  ];

  const year = new Date().getFullYear();
  downloadCsv(`Reading List ${year}.csv`, rows1);
  downloadCsv(`Reading List ${year}_all.csv`, rows2);
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function ShelfPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [books, setBooks] = useState<ShelfBook[]>([]);
  const [activeTab, setActiveTab] = useState<string>("reading");
  const [loading, setLoading] = useState(true);

  // Active session / timer state
  const [activeSession, setActiveSession] = useState<ActiveSession>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer panel state
  const [timerBook, setTimerBook] = useState<ShelfBook | null>(null);
  const [timerEndPage, setTimerEndPage] = useState("");
  const [timerStartPage, setTimerStartPage] = useState<string>("");
  const [timerPhase, setTimerPhase] = useState<"idle" | "running">("idle");

  // Add book form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [isbn, setIsbn] = useState("");
  const [isbnLoading, setIsbnLoading] = useState(false);
  const [isbnError, setIsbnError] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formCover, setFormCover] = useState("");
  const [formYear, setFormYear] = useState("");
  const [formPageCount, setFormPageCount] = useState("");
  const [formStatus, setFormStatus] = useState("want_to_read");
  const [formReadingType, setFormReadingType] = useState("paper");
  const [addingBook, setAddingBook] = useState(false);
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState(false);

  // Import CSV state
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");

  useEffect(() => {
    setHasBarcodeDetector(typeof window !== "undefined" && "BarcodeDetector" in window);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) { router.replace("/auth"); return; }
        setUser(data.user);
      })
      .catch(() => router.replace("/auth"));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch(`/api/reviews?username=${encodeURIComponent(user.username)}`).then((r) => r.json()),
      fetch("/api/reading-sessions/active").then((r) => r.json()),
    ]).then(([reviewData, sessionData]) => {
      setBooks(reviewData.reviews ?? []);
      if (sessionData.session) {
        setActiveSession(sessionData.session);
        const elapsed = Math.floor((Date.now() - new Date(sessionData.session.startedAt).getTime()) / 1000);
        setTimerSeconds(elapsed);
        setTimerPhase("running");
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  // Timer tick
  useEffect(() => {
    if (timerPhase === "running") {
      timerRef.current = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerPhase]);

  async function handleStartTimer(book: ShelfBook) {
    if (activeSession) {
      setTimerBook(book);
      // timer interval picks up from activeSession.startedAt
      return;
    }

    const initialStartPage = String(book.currentPage ?? "");
    setTimerBook(book);
    setTimerEndPage("");
    setTimerStartPage(initialStartPage);
    setTimerPhase("idle");

    const res = await fetch("/api/reading-sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reviewId: book.id,
        bookId: book.bookId,
        startPage: initialStartPage !== "" ? parseInt(initialStartPage) : null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setActiveSession({
        id: data.session.id,
        bookId: book.bookId,
        bookTitle: book.title,
        bookCover: book.coverImageUrl,
        reviewId: book.id,
        startedAt: data.session.startedAt,
        startPage: data.session.startPage,
      });
      setTimerSeconds(0);
      setTimerPhase("running");
    }
  }

  async function handleStopTimer() {
    if (!activeSession || !timerEndPage.trim()) return;
    const endPage = parseInt(timerEndPage);
    if (isNaN(endPage)) return;

    const res = await fetch(`/api/reading-sessions/${activeSession.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endPage }),
    });
    if (res.ok) {
      setBooks((prev) =>
        prev.map((b) =>
          b.id === activeSession.reviewId ? { ...b, currentPage: endPage } : b
        )
      );
      setActiveSession(null);
      setTimerBook(null);
      setTimerPhase("idle");
      setTimerSeconds(0);
    }
  }

  async function handleDiscardSession() {
    if (!activeSession) return;
    const res = await fetch(`/api/reading-sessions/${activeSession.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endPage: activeSession.startPage ?? 0 }),
    });
    if (!res.ok) return; // leave state intact on failure
    setActiveSession(null);
    setTimerBook(null);
    setTimerPhase("idle");
    setTimerSeconds(0);
  }

  async function handleIsbnLookup() {
    if (!isbn.trim()) return;
    setIsbnLoading(true);
    setIsbnError("");
    const res = await fetch(`/api/books/isbn/${isbn.trim()}`);
    const data = await res.json();
    setIsbnLoading(false);
    if (!res.ok) {
      setIsbnError(data.error ?? "Không tìm thấy sách.");
      return;
    }
    setFormTitle(data.title ?? "");
    setFormAuthor(data.author ?? "");
    setFormCover(data.coverUrl ?? "");
    setFormYear(data.publishYear?.toString() ?? "");
  }

  async function handleScanBarcode() {
    if (!hasBarcodeDetector) return;
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      await new Promise<void>((resolve) => {
        if (video.videoWidth > 0) { resolve(); return; }
        video.addEventListener("loadedmetadata", () => resolve(), { once: true });
      });
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0);
      // @ts-expect-error BarcodeDetector is not in TS lib yet
      const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a"] });
      const barcodes = await detector.detect(canvas);
      if (barcodes.length > 0) {
        setIsbn(barcodes[0].rawValue);
      }
    } catch {
      // Camera permission denied or not supported — silent fail
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
    }
  }

  async function handleAddBook(e: FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formAuthor.trim()) return;
    setAddingBook(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: formTitle.trim(),
        author: formAuthor.trim(),
        coverImageUrl: formCover.trim() || undefined,
        publishYear: formYear ? parseInt(formYear) : null,
        isbn: isbn.trim() || undefined,
        pageCount: formPageCount ? parseInt(formPageCount) : null,
        rating: 3,
        status: formStatus,
        readingType: formReadingType,
        comment: ".",
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setBooks((prev) => [data.review, ...prev]);
      setShowAddForm(false);
      setIsbn(""); setFormTitle(""); setFormAuthor("");
      setFormCover(""); setFormYear(""); setFormPageCount("");
      setFormStatus("want_to_read");
    }
    setAddingBook(false);
  }

  async function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) return;

    const headers = rows[0].map((h) => h.trim());
    const isFormat2 = headers[0] === "Name" && headers[1] === "Author";

    let nameIdx: number, authorIdx: number, statusIdx: number, scoreIdx: number;
    let epubIdx: number, sachGiayIdx: number, summaryIdx: number, startIdx: number, endIdx: number;
    if (isFormat2) {
      nameIdx = 0; authorIdx = 1; epubIdx = 2; endIdx = 3;
      scoreIdx = 4; startIdx = 5; statusIdx = 6; summaryIdx = 7; sachGiayIdx = 8;
    } else {
      // Format 1: Type,Name,Status,Score /5,Author,EPUB/PDF/Audio,Sách Giấy,Summary,Start,End
      nameIdx = 1; statusIdx = 2; scoreIdx = 3; authorIdx = 4;
      epubIdx = 5; sachGiayIdx = 6; summaryIdx = 7; startIdx = 8; endIdx = 9;
    }
    // epubIdx used only for format detection — readingType derived from sachGiayIdx
    void epubIdx;

    const dataRows = rows.slice(1).filter((r) => (r[nameIdx] ?? "").trim());
    setImporting(true);

    const added: ShelfBook[] = [];
    for (let i = 0; i < dataRows.length; i++) {
      const r = dataRows[i];
      const get = (idx: number) => (r[idx] ?? "").trim();
      setImportProgress(`Đang import ${i + 1}/${dataRows.length}…`);

      const title = get(nameIdx);
      if (!title) continue;
      const author = get(authorIdx) || "Unknown";
      const status = STATUS_FROM_CSV[get(statusIdx)] ?? "want_to_read";
      const stars = countStars(get(scoreIdx));
      const rating = stars > 0 ? stars : 3;
      const readingType = get(sachGiayIdx).toLowerCase() === "yes" ? "paper" : "kindle";
      const comment = get(summaryIdx) || ".";
      const startDate = parseIso(get(startIdx));
      const endDate = parseIso(get(endIdx));

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, author, rating, status, readingType, comment, startDate, endDate }),
      });
      if (res.ok) {
        const data = await res.json();
        added.push(data.review);
      }
    }

    setBooks((prev) => [...added.reverse(), ...prev]);
    setImporting(false);
    setImportProgress(`Đã import ${added.length}/${dataRows.length} sách.`);
    setTimeout(() => setImportProgress(""), 4000);
  }

  const filtered = books.filter((b) => b.status === activeTab);

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopNav username={user.username} pageTitle="SHELF" />

      {/* Resume session banner */}
      {activeSession && timerPhase === "running" && !timerBook && (
        <div style={{ background: "var(--accent)", color: "#fff", padding: "10px 20px", display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ flex: 1 }}>Bạn có session đang dở cho {activeSession.bookTitle}. Tiếp tục?</span>
          <button onClick={() => {
            const book = books.find((b) => b.id === activeSession.reviewId);
            if (book) setTimerBook(book);
          }} style={btnSmall}>Tiếp tục</button>
          <button onClick={handleDiscardSession} style={{ ...btnSmall, background: "rgba(0,0,0,0.2)" }}>Huỷ</button>
        </div>
      )}

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "28px 16px", width: "100%" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {STATUS_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: "7px 16px", borderRadius: 20, border: "none", cursor: "pointer",
                background: activeTab === tab.key ? "var(--accent)" : "var(--card-border)",
                color: activeTab === tab.key ? "#fff" : "var(--text-primary)", fontWeight: 600, fontSize: 13 }}>
              {tab.label}
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            {importProgress && (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{importProgress}</span>
            )}
            <input ref={importInputRef} type="file" accept=".csv" style={{ display: "none" }}
              onChange={handleImportCsv} />
            <button onClick={() => importInputRef.current?.click()} disabled={importing}
              style={{ padding: "7px 16px", borderRadius: 20, border: "1px solid var(--card-border)",
                background: "transparent", color: "var(--text-primary)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              {importing ? "…" : "↑ Import CSV"}
            </button>
            <button onClick={() => exportCsv(books)}
              style={{ padding: "7px 16px", borderRadius: 20, border: "1px solid var(--card-border)",
                background: "transparent", color: "var(--text-primary)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              ↓ Export CSV
            </button>
            <button onClick={() => setShowAddForm((v) => !v)}
              style={{ padding: "7px 16px", borderRadius: 20, border: "1px solid var(--accent)",
                background: "transparent", color: "var(--accent)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              + Thêm sách
            </button>
          </div>
        </div>

        {/* Add book form */}
        {showAddForm && (
          <form onSubmit={handleAddBook} style={{ border: "1px solid var(--card-border)", borderRadius: 10,
            padding: 20, marginBottom: 24, background: "var(--card-bg)", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="ISBN"
                style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={handleIsbnLookup} disabled={isbnLoading}
                style={{ ...btnPrimary, padding: "8px 14px" }}>
                {isbnLoading ? "…" : "Tìm"}
              </button>
              {hasBarcodeDetector && (
                <button type="button" onClick={handleScanBarcode}
                  style={{ ...btnPrimary, padding: "8px 14px", background: "var(--card-border)", color: "var(--text-primary)" }}>
                  📷
                </button>
              )}
            </div>
            {isbnError && <p style={{ color: "#ef4444", fontSize: 12, margin: 0 }}>{isbnError}</p>}
            <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Tên sách *" required style={inputStyle} />
            <input value={formAuthor} onChange={(e) => setFormAuthor(e.target.value)} placeholder="Tác giả *" required style={inputStyle} />
            <input value={formCover} onChange={(e) => setFormCover(e.target.value)} placeholder="URL ảnh bìa" style={inputStyle} />
            <div style={{ display: "flex", gap: 8 }}>
              <input value={formYear} onChange={(e) => setFormYear(e.target.value)} placeholder="Năm XB" type="number" style={{ ...inputStyle, flex: 1 }} />
              <input value={formPageCount} onChange={(e) => setFormPageCount(e.target.value)} placeholder="Số trang" type="number" style={{ ...inputStyle, flex: 1 }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                {STATUS_TABS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              <select value={formReadingType} onChange={(e) => setFormReadingType(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                <option value="paper">Paper</option>
                <option value="kindle">Kindle</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={addingBook} style={btnPrimary}>{addingBook ? "Đang thêm…" : "Thêm sách"}</button>
              <button type="button" onClick={() => setShowAddForm(false)}
                style={{ ...btnPrimary, background: "var(--card-border)", color: "var(--text-primary)" }}>Huỷ</button>
            </div>
          </form>
        )}

        {/* Book list */}
        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Đang tải…</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Không có sách nào.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((book) => {
              const pct = book.pageCount && book.currentPage != null
                ? Math.min(100, Math.round((book.currentPage / book.pageCount) * 100))
                : null;
              const isTimerBook = timerBook?.id === book.id;
              return (
                <div key={book.id} style={{ display: "flex", gap: 14, padding: 16,
                  border: "1px solid var(--card-border)", borderRadius: 10, background: "var(--card-bg)" }}>
                  {book.coverImageUrl && (
                    <img src={book.coverImageUrl} alt={book.title}
                      style={{ width: 56, height: 80, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, margin: 0, fontSize: 15 }}>{book.title}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "2px 0 6px" }}>{book.author}</p>
                    {book.status === "reading" && book.pageCount && book.currentPage != null && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ height: 6, background: "var(--card-border)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct ?? 0}%`, background: "var(--accent)", borderRadius: 3 }} />
                        </div>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "3px 0 0" }}>
                          {book.currentPage ?? 0} / {book.pageCount} trang ({pct ?? 0}%)
                        </p>
                      </div>
                    )}
                    {book.status === "reading" && (
                      isTimerBook ? (
                        <div style={{ marginTop: 6 }}>
                          <p style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums", margin: "0 0 6px" }}>
                            {formatTime(timerSeconds)}
                          </p>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input value={timerStartPage} readOnly
                              placeholder="Trang bắt đầu" type="number" style={{ ...inputStyle, width: 140, opacity: 0.7 }} />
                            <input value={timerEndPage} onChange={(e) => setTimerEndPage(e.target.value)}
                              placeholder="Trang kết thúc" type="number" style={{ ...inputStyle, width: 140 }} />
                            <button onClick={handleStopTimer} style={{ ...btnSmall, background: "#ef4444", color: "#fff" }}>Dừng</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => handleStartTimer(book)} style={btnSmall}>
                          {activeSession ? "Tiếp tục đọc" : "Bắt đầu đọc"}
                        </button>
                      )
                    )}
                    {book.status === "want_to_read" && (
                      <button onClick={async () => {
                        const res = await fetch(`/api/reviews/${book.id}`, {
                          method: "PATCH",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ status: "reading", startDate: new Date().toISOString() }),
                        });
                        if (res.ok) {
                          setBooks((prev) => prev.map((b) => b.id === book.id ? { ...b, status: "reading" } : b));
                        }
                      }} style={btnSmall}>Bắt đầu đọc</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 6,
  border: "1px solid var(--card-border)", background: "var(--input-bg, var(--card-bg))",
  color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box",
};
const btnPrimary: React.CSSProperties = {
  padding: "9px 18px", borderRadius: 6, border: "none",
  background: "var(--accent)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
};
const btnSmall: React.CSSProperties = {
  padding: "5px 14px", borderRadius: 5, border: "1px solid var(--card-border)",
  background: "transparent", color: "var(--text-primary)", fontSize: 12, cursor: "pointer",
};
