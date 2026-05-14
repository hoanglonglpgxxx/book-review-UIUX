"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import TopNav from "@/components/TopNav";
import styles from "./review-detail.module.css";

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
  canEdit?: boolean;
};

const STATUS_LABEL: Record<ReviewStatus, string> = {
  want_to_read: "Muốn đọc",
  not_started: "Chưa đọc",
  reading: "Đang đọc",
  waiting_to_review: "Chờ đánh giá",
  dropped: "Bỏ dở",
};

function getRatingLabel(rating: number) {
  if (rating >= 5) return "Xuất sắc";
  if (rating >= 4) return "Rất ổn";
  if (rating >= 3) return "Đọc được";
  if (rating >= 2) return "Cần cân nhắc";
  return "Không phù hợp";
}

function buildHighlights(review: Review) {
  const highlights: string[] = [];

  if (review.comment.trim().length >= 120) {
    highlights.push("Bài review chi tiết, có chiều sâu và mô tả rõ trải nghiệm đọc.");
  } else {
    highlights.push("Bài review ngắn gọn, tập trung vào nhận định chính.");
  }

  if (review.rating >= 4) {
    highlights.push("Mức đánh giá cao, phù hợp để ưu tiên đưa vào danh sách đọc.");
  } else if (review.rating <= 2) {
    highlights.push("Mức đánh giá thấp, nên xem kỹ nhận xét trước khi đọc.");
  } else {
    highlights.push("Mức đánh giá trung bình, hợp với nhóm độc giả phù hợp chủ đề.");
  }

  if (review.description?.trim()) {
    highlights.push("Có phần mô tả sách riêng, giúp nắm bối cảnh trước khi đọc review.");
  }

  if (review.isbn) {
    highlights.push("Đã có ISBN để tra cứu hoặc đối chiếu phiên bản sách.");
  }

  return highlights;
}

function isImageSource(value: string | undefined) {
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
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const tzOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default function ReviewDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [status, setStatus] = useState("");
  const [hasError, setHasError] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [readingType, setReadingType] = useState<ReadingType>("paper");
  const [pageCount, setPageCount] = useState("");

  const reviewId = params.id;
  const highlightItems = review ? buildHighlights(review) : [];

  function fillFormFromReview(data: Review) {
    setTitle(data.title);
    setAuthor(data.author);
    setDescription(data.description ?? "");
    setCoverImageUrl(data.coverImageUrl ?? "");
    setPublishYear(data.publishYear ? String(data.publishYear) : "");
    setIsbn(data.isbn ?? "");
    setRating(data.rating);
    setComment(data.comment);
    setReadStatus(data.status);
    setStartDate(toDateTimeLocalValue(data.startDate));
    setEndDate(toDateTimeLocalValue(data.endDate));
    setReadingType(data.readingType ?? "paper");
    setPageCount(data.pageCount ? String(data.pageCount) : "");
  }

  const loadSession = useCallback(async () => {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    const sessionUser = data.user ?? null;
    setUser(sessionUser);
    return sessionUser as SessionUser | null;
  }, []);

  const loadReview = useCallback(async () => {
    const response = await fetch(`/api/reviews/${reviewId}`, { cache: "no-store" });

    if (response.status === 401) {
      router.replace("/auth");
      return;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(data.error ?? "Không tải được review.");
      setHasError(true);
      return;
    }

    const nextReview: Review = data.review;
    setReview(nextReview);
    fillFormFromReview(nextReview);
  }, [reviewId, router]);

  useEffect(() => {
    async function bootstrap() {
      const session = await loadSession();
      if (!session) {
        router.replace("/auth");
        return;
      }

      await loadReview();
    }

    if (reviewId) {
      bootstrap();
    }
  }, [loadReview, loadSession, reviewId, router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth");
    router.refresh();
  }

  async function handleDeleteReview() {
    if (!review?.canEdit) {
      setStatus("Bạn chỉ có thể xóa review của chính mình.");
      setHasError(true);
      return;
    }

    const confirmed = window.confirm(`Xóa review \"${review.title}\"?`);
    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/reviews/${review.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(data.error ?? "Không thể xóa review.");
      setHasError(true);
      return;
    }

    router.push("/reviews");
    router.refresh();
  }

  async function handleSelectCoverFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

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

  async function handleSubmitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!review || !review.canEdit) {
      setStatus("Bạn không có quyền chỉnh sửa review này.");
      setHasError(true);
      return;
    }

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

    const response = await fetch(`/api/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(data.error ?? "Không thể cập nhật review.");
      setHasError(true);
      setIsSubmitting(false);
      return;
    }

    setShowEditModal(false);
    setStatus("Đã cập nhật review.");
    setHasError(false);
    setIsSubmitting(false);
    await loadReview();
  }

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <TopNav username={user?.username} />

        {status ? <p className={`${styles.status} ${hasError ? styles.error : ""}`}>{status}</p> : null}

        {review ? (
          <section className={styles.frame}>
            <article className={styles.left}>
              <div className={styles.leftTop}>
                <div className={styles.links}>
                  <span>Search</span>
                  <span>Contact</span>
                  <span>About</span>
                </div>
                <div className={styles.links}>
                  <span>X</span>
                  <span>IG</span>
                  <span>FB</span>
                </div>
              </div>

              <h1 className={styles.bigTitle}>{review.title}</h1>
              <div className={styles.leftMeta}>
                <p>{review.author}</p>
                <p>{"★".repeat(review.rating)}</p>
                <p>{STATUS_LABEL[review.status]}</p>
              </div>

              <div className={styles.poster}>
                {isImageSource(review.coverImageUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={review.coverImageUrl} alt={review.title} />
                ) : (
                  <div className={styles.posterFallback}>{review.title.slice(0, 1).toUpperCase()}</div>
                )}
              </div>
            </article>

            <article className={styles.right}>
              <div className={styles.storyCard}>
                <p className={styles.storyLabel}>The Reviewed Book</p>
                <p className={styles.storyCardTitle}>{review.title.slice(0, 10).toUpperCase()}</p>
                <p className={styles.storyLabel}>Community Pick</p>
              </div>

              <p className={styles.author}>{review.author}</p>
              <h2 className={styles.title}>{review.title}</h2>
              <p className={styles.comment}>{review.comment}</p>
              {review.description ? <p className={styles.comment}>{review.description}</p> : null}

              <section className={styles.metricsGrid}>
                <article className={styles.metricCard}>
                  <p className={styles.metricLabel}>Điểm đánh giá</p>
                  <p className={styles.metricValue}>{review.rating}/5</p>
                  <p className={styles.metricSub}>{getRatingLabel(review.rating)}</p>
                </article>
                <article className={styles.metricCard}>
                  <p className={styles.metricLabel}>Trạng thái đọc</p>
                  <p className={styles.metricValue}>{STATUS_LABEL[review.status]}</p>
                  <p className={styles.metricSub}>Cập nhật bởi người viết review</p>
                </article>
                <article className={styles.metricCard}>
                  <p className={styles.metricLabel}>Độ dài nhận xét</p>
                  <p className={styles.metricValue}>{review.comment.trim().length} ký tự</p>
                  <p className={styles.metricSub}>Mức chi tiết của bài viết</p>
                </article>
              </section>

              <section className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>Tóm tắt đánh giá</h3>
                <p className={styles.sectionText}>
                  {review.username} chấm <strong>{review.rating}/5</strong> cho cuốn sách này, trạng thái hiện tại là{" "}
                  <strong>{STATUS_LABEL[review.status]}</strong>. Nhận xét tập trung vào cảm nhận cá nhân và mức độ phù hợp với người đọc có cùng gu.
                </p>
              </section>

              <section className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>Điểm nổi bật</h3>
                <ul className={styles.highlightList}>
                  {highlightItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <div className={styles.actions}>
                <Link className={styles.btnSecondary} href="/reviews">
                  Quay lại danh sách
                </Link>
                {review.canEdit ? (
                  <button className={styles.btnPrimary} type="button" onClick={() => setShowEditModal(true)}>
                    Sửa review
                  </button>
                ) : null}
                {review.canEdit ? (
                  <button className={styles.btnGhost} type="button" onClick={handleDeleteReview}>
                    Xóa review
                  </button>
                ) : null}
                <button className={styles.btnGhost} type="button" onClick={handleLogout}>
                  Đăng xuất
                </button>
              </div>

              <div className={styles.facts}>
                <p>
                  <strong>Reviewer:</strong> @{review.username}
                </p>
                <p>
                  <strong>ISBN:</strong> {review.isbn || "Chưa có"}
                </p>
                <p>
                  <strong>Năm XB:</strong> {review.publishYear ?? "Chưa có"}
                </p>
                <p>
                  <strong>Bắt đầu đọc:</strong> {review.startDate ? new Date(review.startDate).toLocaleString("vi-VN") : "Chưa có"}
                </p>
                <p>
                  <strong>Kết thúc đọc:</strong> {review.endDate ? new Date(review.endDate).toLocaleString("vi-VN") : "Chưa có"}
                </p>
                <p>
                  <strong>Kiểu đọc:</strong> {review.readingType === "kindle" ? "Kindle" : "Sách giấy"}
                </p>
                <p>
                  <strong>Số trang:</strong> {review.pageCount ?? "Chưa có"}
                </p>
                <p>
                  <strong>Thời gian:</strong> {new Date(review.createdAt).toLocaleString("vi-VN")}
                </p>
                <p>
                  <strong>ID review:</strong> {review.id}
                </p>
              </div>
            </article>
          </section>
        ) : (
          <section className={styles.frame}>
            <article className={styles.right}>
              <p>Không tìm thấy review.</p>
              <div className={styles.actions}>
                <Link className={styles.btnSecondary} href="/reviews">
                  Quay lại danh sách
                </Link>
              </div>
            </article>
          </section>
        )}

        {showEditModal && review ? (
          <div className={styles.modalOverlay} role="dialog" aria-modal="true" onClick={() => setShowEditModal(false)}>
            <section className={styles.modal} onClick={(event) => event.stopPropagation()}>
              <h2>Chỉnh sửa review</h2>
              <form className={styles.form} onSubmit={handleSubmitEdit}>
                <label>
                  Tên sách
                  <input className={styles.input} type="text" required value={title} onChange={(event) => setTitle(event.target.value)} />
                </label>
                <label>
                  Tác giả
                  <input className={styles.input} type="text" required value={author} onChange={(event) => setAuthor(event.target.value)} />
                </label>
                <label>
                  Mô tả sách
                  <textarea className={styles.textarea} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
                </label>
                <label>
                  Ảnh bìa (URL hoặc upload)
                  <input
                    className={styles.input}
                    type="text"
                    value={coverImageUrl}
                    onChange={(event) => setCoverImageUrl(event.target.value)}
                    placeholder="https://... hoặc data:image/..."
                  />
                </label>
                <label>
                  Upload ảnh bìa
                  <input className={styles.input} type="file" accept="image/*" onChange={handleSelectCoverFile} />
                </label>

                {isImageSource(coverImageUrl) ? (
                  <div className={styles.imagePreviewBox}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverImageUrl} alt="Preview" className={styles.imagePreview} />
                  </div>
                ) : null}

                <label>
                  Năm xuất bản
                  <input
                    className={styles.input}
                    type="number"
                    min={0}
                    max={3000}
                    value={publishYear}
                    onChange={(event) => setPublishYear(event.target.value)}
                  />
                </label>
                <label>
                  ISBN
                  <input className={styles.input} type="text" value={isbn} onChange={(event) => setIsbn(event.target.value)} />
                </label>
                <label>
                  Trạng thái đọc
                  <select className={styles.select} value={readStatus} onChange={(event) => setReadStatus(event.target.value as ReviewStatus)}>
                    <option value="not_started">Chưa đọc</option>
                    <option value="reading">Đang đọc</option>
                    <option value="waiting_to_review">Chờ đánh giá</option>
                    <option value="dropped">Bỏ dở</option>
                  </select>
                </label>
                <label>
                  Thời gian bắt đầu đọc
                  <input className={styles.input} type="datetime-local" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </label>
                <label>
                  Thời gian kết thúc đọc
                  <input className={styles.input} type="datetime-local" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </label>
                <label>
                  Kiểu đọc
                  <select className={styles.select} value={readingType} onChange={(event) => setReadingType(event.target.value as ReadingType)}>
                    <option value="paper">Sách giấy</option>
                    <option value="kindle">Kindle</option>
                  </select>
                </label>
                <label>
                  Số trang
                  <input className={styles.input} type="number" min={1} value={pageCount} onChange={(event) => setPageCount(event.target.value)} />
                </label>
                <label>
                  Điểm (1-5)
                  <input
                    className={styles.input}
                    type="number"
                    min={1}
                    max={5}
                    required
                    value={rating}
                    onChange={(event) => setRating(Number(event.target.value))}
                  />
                </label>
                <label>
                  Nhận xét
                  <textarea className={styles.textarea} rows={4} required value={comment} onChange={(event) => setComment(event.target.value)} />
                </label>

                <div className={styles.actions}>
                  <button className={styles.btnPrimary} type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Đang lưu..." : "Cập nhật"}
                  </button>
                  <button className={styles.btnGhost} type="button" onClick={() => setShowEditModal(false)}>
                    Hủy
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
