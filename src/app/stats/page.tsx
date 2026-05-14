// src/app/stats/page.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";

type SessionUser = { userId: string; email: string; username: string };

type MonthData = { month: number; books: number; pages: number };

type StatsData = {
  year: number;
  booksFinished: number;
  totalPages: number;
  streak: number;
  monthly: MonthData[];
  avgPagesPerHour: number;
  kindleCount: number;
  paperCount: number;
  readingGoal: { year: number; target: number } | null;
};

const MONTH_LABELS = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];

export default function StatsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [editGoal, setEditGoal] = useState(false);
  const [goalTarget, setGoalTarget] = useState("");
  const [goalYear, setGoalYear] = useState(String(new Date().getFullYear()));
  const [savingGoal, setSavingGoal] = useState(false);

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
    setLoading(true);
    fetch(`/api/stats?year=${year}`)
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user, year]);

  async function handleSaveGoal(e: FormEvent) {
    e.preventDefault();
    setSavingGoal(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ readingGoal: { year: parseInt(goalYear, 10), target: parseInt(goalTarget, 10) } }),
      });
      const data = await res.json();
      if (res.ok) {
        setStats((prev) => prev ? { ...prev, readingGoal: data.readingGoal } : prev);
        setEditGoal(false);
      }
    } finally {
      setSavingGoal(false);
    }
  }

  if (!user) return null;

  const maxBooks = stats ? Math.max(...stats.monthly.map((m) => m.books), 1) : 1;
  const goal = stats?.readingGoal;
  const goalProgress = goal && stats && goal.target > 0 ? Math.min(100, Math.round((stats.booksFinished / goal.target) * 100)) : null;
  const totalFormat = stats ? (stats.kindleCount + stats.paperCount) : 0;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopNav username={user.username} pageTitle="STATS" />

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "28px 16px", width: "100%" }}>
        {/* Year selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <button onClick={() => setYear((y) => y - 1)} style={navBtn}>‹</button>
          <span style={{ fontWeight: 700, fontSize: 20 }}>{year}</span>
          <button onClick={() => setYear((y) => y + 1)} disabled={year >= new Date().getFullYear()} style={navBtn}>›</button>
        </div>

        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Đang tải…</p>
        ) : !stats ? null : (
          <>
            {/* Highlight numbers */}
            <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
              {[
                { label: "Sách đã đọc", value: stats.booksFinished },
                { label: "Tổng trang", value: stats.totalPages.toLocaleString() },
                { label: "Streak (ngày)", value: stats.streak },
              ].map(({ label, value }) => (
                <div key={label} style={{ flex: "1 1 140px", padding: 20, border: "1px solid var(--card-border)", borderRadius: 10, background: "var(--card-bg)", textAlign: "center" }}>
                  <p style={{ fontSize: 32, fontWeight: 800, margin: 0, color: "var(--accent)" }}>{value}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Goal */}
            <div style={{ padding: 20, border: "1px solid var(--card-border)", borderRadius: 10, background: "var(--card-bg)", marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <p style={{ fontWeight: 700, margin: 0 }}>
                  Mục tiêu {goal ? `${year}` : ""}
                </p>
                <button onClick={() => { setEditGoal((v) => !v); setGoalTarget(goal?.target?.toString() ?? ""); setGoalYear(String(year)); }} style={btnLink}>
                  {goal ? "Sửa" : "Đặt mục tiêu"}
                </button>
              </div>
              {editGoal ? (
                <form onSubmit={handleSaveGoal} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} placeholder="Số sách" type="number" min={1} required style={{ ...inputStyle, width: 100 }} />
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>cuốn năm</span>
                  <input value={goalYear} onChange={(e) => setGoalYear(e.target.value)} type="number" min={2000} max={2100} required style={{ ...inputStyle, width: 80 }} />
                  <button type="submit" disabled={savingGoal} style={btnPrimary}>{savingGoal ? "…" : "Lưu"}</button>
                </form>
              ) : goal ? (
                <>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 8px" }}>
                    {stats.booksFinished} / {goal.target} cuốn năm {goal.year}
                  </p>
                  <div style={{ height: 10, background: "var(--card-border)", borderRadius: 5, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${goalProgress ?? 0}%`, background: "var(--accent)", borderRadius: 5, transition: "width 0.3s" }} />
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>{goalProgress}%</p>
                </>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Chưa đặt mục tiêu.</p>
              )}
            </div>

            {/* Monthly bar chart (SVG) */}
            <div style={{ padding: 20, border: "1px solid var(--card-border)", borderRadius: 10, background: "var(--card-bg)", marginBottom: 24 }}>
              <p style={{ fontWeight: 700, margin: "0 0 16px" }}>Sách đọc theo tháng</p>
              <svg viewBox="0 0 600 140" style={{ width: "100%", overflow: "visible" }}>
                {stats.monthly.map((m, i) => {
                  const barH = maxBooks > 0 ? (m.books / maxBooks) * 90 : 0;
                  const x = i * 50 + 10;
                  return (
                    <g key={m.month}>
                      <rect x={x} y={100 - barH} width={30} height={barH} fill="var(--accent)" opacity={0.85} rx={3}>
                        <title>{MONTH_LABELS[i]}: {m.books} cuốn, {m.pages} trang</title>
                      </rect>
                      <text x={x + 15} y={118} textAnchor="middle" fontSize={10} fill="var(--text-muted)">{MONTH_LABELS[i]}</text>
                      {m.books > 0 && (
                        <text x={x + 15} y={Math.max(10, 96 - barH)} textAnchor="middle" fontSize={10} fill="var(--text-primary)">{m.books}</text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Breakdown */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px", padding: 20, border: "1px solid var(--card-border)", borderRadius: 10, background: "var(--card-bg)" }}>
                <p style={{ fontWeight: 700, margin: "0 0 12px" }}>Hình thức đọc</p>
                {totalFormat > 0 ? (
                  <>
                    <p style={{ fontSize: 13, margin: "0 0 4px" }}>📱 Kindle: {stats.kindleCount} ({Math.round(stats.kindleCount / totalFormat * 100)}%)</p>
                    <p style={{ fontSize: 13, margin: 0 }}>📖 Paper: {stats.paperCount} ({Math.round(stats.paperCount / totalFormat * 100)}%)</p>
                  </>
                ) : <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Chưa có dữ liệu.</p>}
              </div>
              <div style={{ flex: "1 1 200px", padding: 20, border: "1px solid var(--card-border)", borderRadius: 10, background: "var(--card-bg)" }}>
                <p style={{ fontWeight: 700, margin: "0 0 12px" }}>Tốc độ đọc</p>
                {stats.avgPagesPerHour > 0 ? (
                  <p style={{ fontSize: 28, fontWeight: 800, color: "var(--accent)", margin: 0 }}>
                    {stats.avgPagesPerHour} <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)" }}>trang/giờ</span>
                  </p>
                ) : <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Chưa có session nào.</p>}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px", borderRadius: 6, border: "1px solid var(--card-border)",
  background: "var(--input-bg, var(--card-bg))", color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box",
};
const btnPrimary: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 6, border: "none",
  background: "var(--accent)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
};
const navBtn: React.CSSProperties = {
  padding: "4px 12px", borderRadius: 6, border: "1px solid var(--card-border)",
  background: "transparent", color: "var(--text-primary)", fontSize: 18, cursor: "pointer",
};
const btnLink: React.CSSProperties = {
  background: "none", border: "none", color: "var(--accent)", fontWeight: 600,
  fontSize: 13, cursor: "pointer", padding: 0,
};
