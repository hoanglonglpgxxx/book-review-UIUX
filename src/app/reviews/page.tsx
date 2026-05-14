"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import TopNav from "@/components/TopNav";
import styles from "./reviews-page.module.css";

type SessionUser = {
  userId: string;
  email: string;
  username: string;
};

type ReviewStatus = "want_to_read" | "not_started" | "reading" | "waiting_to_review" | "dropped";
type ReadingType = "kindle" | "paper";

type Review = {
  id: string;
  userId?: string;
  username: string;
  title: string;
  author: string;
  description?: string;
  coverImageUrl?: string;
  publishYear?: number | null;
  isbn?: string | null;
  rating: number;
  comment: string;
  status: ReviewStatus;
  startDate?: string | null;
  endDate?: string | null;
  readingType?: ReadingType;
  pageCount?: number | null;
  currentPage?: number | null;
  createdAt: string;
};

const STATUS_LABEL: Record<ReviewStatus, string> = {
  want_to_read: "Muốn đọc",
  not_started: "Chưa đọc",
  reading: "Đang đọc",
  waiting_to_review: "Chờ đánh giá",
  dropped: "Bỏ dở",
};

type ModalMode = "create" | "edit" | null;

function isImageSource(value: string | undefined): value is string {
  return Boolean(value && (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/")));
}

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Không thể đọc ảnh."));
    reader.readAsDataURL(file);
  });
}

function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const tzOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function getNowDateTimeLocalValue() {
  return toDateTimeLocalValue(new Date().toISOString());
}

export default function ReviewsPage() {
  const router = useRouter();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [status, setStatus] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [publishYear, setPublishYear] = useState("");
  const [isbn, setIsbn] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [readStatus, setReadStatus] = useState<ReviewStatus>("waiting_to_review");
  const [startDate, setStartDate] = useState(getNowDateTimeLocalValue());
  const [endDate, setEndDate] = useState("");
  const [readingType, setReadingType] = useState<ReadingType>("paper");
  const [pageCount, setPageCount] = useState("");

  const filteredReviews = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return reviews;
    return reviews.filter(
      (item) =>
        item.title.toLowerCase().includes(keyword) ||
        item.author.toLowerCase().includes(keyword) ||
        item.username.toLowerCase().includes(keyword),
    );
  }, [reviews, query]);

  // Derive selected review: explicit user pick first, then first in list
  const selectedReview = useMemo<Review | null>(() => {
    if (selectedId) {
      const found = reviews.find((r) => r.id === selectedId);
      if (found) return found;
    }
    return filteredReviews[0] ?? null;
  }, [selectedId, reviews, filteredReviews]);

  function resetForm() {
    setTitle("");
    setAuthor("");
    setDescription("");
    setCoverImageUrl("");
    setPublishYear("");
    setIsbn("");
    setRating(5);
    setComment("");
    setReadStatus("waiting_to_review");
    setStartDate(getNowDateTimeLocalValue());
    setEndDate("");
    setReadingType("paper");
    setPageCount("");
  }

  function fillFormFromReview(review: Review) {
    setTitle(review.title);
    setAuthor(review.author);
    setDescription(review.description ?? "");
    setCoverImageUrl(review.coverImageUrl ?? "");
    setPublishYear(review.publishYear ? String(review.publishYear) : "");
    setIsbn(review.isbn ?? "");
    setRating(review.rating);
    setComment(review.comment);
    setReadStatus(review.status);
    setStartDate(toDateTimeLocalValue(review.startDate));
    setEndDate(toDateTimeLocalValue(review.endDate));
    setReadingType(review.readingType ?? "paper");
    setPageCount(review.pageCount ? String(review.pageCount) : "");
  }

  async function loadSession() {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    const sessionUser = data.user ?? null;
    setUser(sessionUser);
    return sessionUser as SessionUser | null;
  }

  async function loadReviews() {
    const response = await fetch("/api/reviews", { cache: "no-store" });
    if (response.status === 401) {
      setReviews([]);
      return;
    }
    const data = await response.json().catch(() => ({}));
    setReviews(data.reviews ?? []);
  }

  useEffect(() => {
    async function bootstrap() {
      setIsLoading(true);
      const session = await loadSession();
      if (!session) {
        router.replace("/auth");
        setIsLoading(false);
        return;
      }
      await loadReviews();
      setIsLoading(false);
    }
    bootstrap();
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth");
    router.refresh();
  }

  async function handleSelectCoverFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("Vui lòng chọn file ảnh hợp lệ.");
      setHasError(true);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setStatus("Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn 2MB.");
      setHasError(true);
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setCoverImageUrl(dataUrl);
      setStatus("Đã tải ảnh lên.");
      setHasError(false);
    } catch {
      setStatus("Không đọc được ảnh tải lên.");
      setHasError(true);
    }
  }

  function openCreateModal() {
    resetForm();
    setEditingReview(null);
    setModalMode("create");
    setStatus("");
    setHasError(false);
  }

  function openEditModal(review: Review) {
    fillFormFromReview(review);
    setEditingReview(review);
    setModalMode("edit");
    setStatus("");
    setHasError(false);
  }

  async function handleDeleteReview(review: Review) {
    if (!user || review.userId !== user.userId) {
      setStatus("Bạn chỉ có thể xóa review của chính mình.");
      setHasError(true);
      return;
    }
    const confirmed = window.confirm(`Xóa review "${review.title}"?`);
    if (!confirmed) return;

    const response = await fetch(`/api/reviews/${review.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(data.error ?? "Không thể xóa review.");
      setHasError(true);
      return;
    }
    if (selectedReview?.id === review.id) setSelectedId(null);
    await loadReviews();
    setStatus("Đã xóa review.");
    setHasError(false);
  }

  async function handleSubmitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      setStatus("Bạn cần đăng nhập để thao tác review.");
      setHasError(true);
      return;
    }
    const isEdit = modalMode === "edit";
    if (isEdit && !editingReview) {
      setStatus("Không tìm thấy review để chỉnh sửa.");
      setHasError(true);
      return;
    }
    const editingId = isEdit ? editingReview!.id : null;

    setIsSubmitting(true);
    setStatus("");
    setHasError(false);

    const payload = {
      title,
      author,
      description: description.trim() || undefined,
      coverImageUrl: coverImageUrl.trim() || undefined,
      publishYear: publishYear.trim() ? Number(publishYear) : null,
      isbn: isbn.trim() || undefined,
      rating,
      status: readStatus,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
      readingType,
      pageCount: pageCount.trim() ? Number(pageCount) : null,
      comment,
    };

    const response = await fetch(isEdit ? `/api/reviews/${editingId}` : "/api/reviews", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(data.error ?? "Không thể lưu review.");
      setHasError(true);
      setIsSubmitting(false);
      return;
    }

    await loadReviews();
    setModalMode(null);
    setEditingReview(null);
    setStatus(isEdit ? "Đã cập nhật review." : "Đã tạo review mới.");
    setIsSubmitting(false);
  }

  const canEditSelected = Boolean(user && selectedReview && selectedReview.userId === user.userId);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
      <TopNav username={user?.username} pageTitle="DISCOVER" />

      <div className={styles.contentSplit}>
        {/* ── LEFT: Book Grid ── */}
        <div className={styles.leftPanel}>
          <div className={styles.leftHeader}>
            <span className={styles.sectionLabel}>Popular This Week</span>
            <div className={styles.leftControls}>
              <input
                className={styles.searchBox}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search books..."
              />
              <button className={styles.btnAdd} type="button" onClick={openCreateModal} disabled={!user}>
                + Add
              </button>
              <button className={styles.btnLogout} type="button" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          </div>

          {status ? (
            <p className={`${styles.notice} ${hasError ? styles.noticeError : ""}`}>{status}</p>
          ) : null}

          {isLoading ? (
            <p className={styles.bookEmpty}>Loading…</p>
          ) : filteredReviews.length === 0 ? (
            <p className={styles.bookEmpty}>
              {query ? "No books match your search." : "No books yet — add the first one!"}
            </p>
          ) : (
            <div className={styles.bookGrid}>
              {filteredReviews.map((review) => (
                <button
                  key={review.id}
                  className={`${styles.bookCard} ${selectedReview?.id === review.id ? styles.bookCardActive : ""}`}
                  type="button"
                  onClick={() => setSelectedId(review.id)}
                >
                  <div className={styles.bookCoverWrap}>
                    {isImageSource(review.coverImageUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={review.coverImageUrl}
                        alt={review.title}
                        className={styles.bookCoverImg}
                      />
                    ) : (
                      <div className={styles.bookCoverFallback} aria-hidden="true">
                        {review.title.charAt(0)}
                      </div>
                    )}
                  </div>
                  <p className={styles.bookAuthor}>{review.author}</p>
                  <p className={styles.bookTitle}>{review.title}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Featured Panel ── */}
        <div className={styles.rightPanel}>
          {selectedReview ? (
            <>
              <div className={styles.featuredTopRow}>
                <span>Editors&rsquo; Weekly Choice</span>
                <Link href={`/profile/${encodeURIComponent(selectedReview.username)}`}>
                  @{selectedReview.username}
                </Link>
              </div>

              <div className={styles.featuredCoverSection}>
                {/* watermark text behind cover */}
                <div className={styles.watermarkWrap} aria-hidden="true">
                  <span className={styles.watermarkLine}>EDITORS&rsquo;</span>
                  <span className={styles.watermarkLine}>CHOICE</span>
                  <span className={styles.watermarkLine}>BOOK</span>
                  <span className={styles.watermarkLine}>OF THE</span>
                  <span className={styles.watermarkLine}>WEEK</span>
                </div>

                <div className={styles.coverLargeWrap}>
                  {isImageSource(selectedReview.coverImageUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedReview.coverImageUrl}
                      alt={selectedReview.title}
                      className={styles.coverLargeImg}
                    />
                  ) : (
                    <div className={styles.coverLargeFallback} aria-hidden="true">
                      {selectedReview.title.charAt(0)}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.featuredInfo}>
                <p className={styles.featuredAuthor}>{selectedReview.author}</p>
                <h2 className={styles.featuredTitle}>{selectedReview.title}</h2>
                <p className={styles.featuredRating} aria-label={`${selectedReview.rating} out of 5 stars`}>
                  {"★".repeat(selectedReview.rating)}{"☆".repeat(5 - selectedReview.rating)}
                </p>
                {selectedReview.comment ? (
                  <p className={styles.featuredComment}>{selectedReview.comment}</p>
                ) : null}

                <div className={styles.featuredActions}>
                  <Link href={`/reviews/${selectedReview.id}`} className={styles.readBtn}>
                    Read review
                  </Link>
                  {canEditSelected && (
                    <button
                      className={styles.editBtn}
                      type="button"
                      onClick={() => openEditModal(selectedReview)}
                    >
                      Edit
                    </button>
                  )}
                  {canEditSelected && (
                    <button
                      className={styles.deleteBtn}
                      type="button"
                      onClick={() => handleDeleteReview(selectedReview)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className={styles.featuredEmpty}>
              <div className={styles.featuredEmptyIcon} aria-hidden="true">
                {STATUS_LABEL.reading[0]}
              </div>
              <p className={styles.featuredEmptyText}>
                {isLoading ? "Loading…" : "Select a book to view details"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {modalMode ? (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          onClick={() => setModalMode(null)}
        >
          <section className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{modalMode === "edit" ? "Edit Review" : "Add New Book"}</h2>
              <button className={styles.btnGhost} type="button" onClick={() => setModalMode(null)}>
                ✕
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmitReview}>
              <label>
                Book title
                <input
                  className={styles.input}
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label>
                Author
                <input
                  className={styles.input}
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </label>
              <label>
                Description
                <textarea
                  className={styles.textarea}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <label>
                Cover image URL
                <input
                  className={styles.input}
                  type="text"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </label>
              <label>
                Or upload cover
                <input
                  className={styles.input}
                  type="file"
                  accept="image/*"
                  onChange={handleSelectCoverFile}
                />
              </label>

              {isImageSource(coverImageUrl) ? (
                <div className={styles.imagePreviewBox}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImageUrl} alt="Preview" className={styles.imagePreview} />
                </div>
              ) : null}

              <label>
                Publish year
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  max={3000}
                  value={publishYear}
                  onChange={(e) => setPublishYear(e.target.value)}
                />
              </label>
              <label>
                ISBN
                <input
                  className={styles.input}
                  type="text"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                />
              </label>
              <label>
                Reading status
                <select
                  className={styles.select}
                  value={readStatus}
                  onChange={(e) => setReadStatus(e.target.value as ReviewStatus)}
                >
                  <option value="not_started">Not started</option>
                  <option value="reading">Reading</option>
                  <option value="waiting_to_review">Waiting to review</option>
                  <option value="dropped">Dropped</option>
                </select>
              </label>
              <label>
                Start date
                <input
                  className={styles.input}
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label>
                End date
                <input
                  className={styles.input}
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
              <label>
                Format
                <select
                  className={styles.select}
                  value={readingType}
                  onChange={(e) => setReadingType(e.target.value as ReadingType)}
                >
                  <option value="paper">Paper book</option>
                  <option value="kindle">Kindle / E-book</option>
                </select>
              </label>
              <label>
                Page count
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  value={pageCount}
                  onChange={(e) => setPageCount(e.target.value)}
                />
              </label>
              <label>
                Rating (1–5)
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  max={5}
                  required
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                />
              </label>
              <label>
                Review / comment
                <textarea
                  className={styles.textarea}
                  rows={4}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </label>

              {status ? (
                <p className={`${styles.notice} ${hasError ? styles.noticeError : ""}`}>{status}</p>
              ) : null}

              <button className={styles.btnPrimary} type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : modalMode === "edit" ? "Update review" : "Save review"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
      </div>
    </div>
  );
}
