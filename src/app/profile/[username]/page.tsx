"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import TopNav from "@/components/TopNav";
import styles from "@/app/app-pages.module.css";

type SessionUser = {
  userId: string;
  email: string;
  username: string;
};

type Review = {
  id: string;
  username: string;
  title: string;
  author: string;
  rating: number;
  comment: string;
  status: "not_started" | "reading" | "waiting_to_review" | "dropped";
  createdAt: string;
};

type ReviewsResponse = {
  reviews?: Review[];
  profile?: {
    username: string;
    found: boolean;
  };
};

const STATUS_LABEL: Record<Review["status"], string> = {
  not_started: "Chưa đọc",
  reading: "Đang đọc",
  waiting_to_review: "Chờ đánh giá",
  dropped: "Bỏ dở",
};

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams<{ username: string }>();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [profileName, setProfileName] = useState("");
  const [notFound, setNotFound] = useState(false);

  const username = decodeURIComponent(params.username ?? "");

  useEffect(() => {
    async function bootstrap() {
      const [sessionResponse, reviewsResponse] = await Promise.all([
        fetch("/api/auth/me", { cache: "no-store" }),
        fetch(`/api/reviews?username=${encodeURIComponent(username)}`, { cache: "no-store" }),
      ]);

      const sessionData = await sessionResponse.json();
      setUser(sessionData.user ?? null);

      const reviewData: ReviewsResponse = await reviewsResponse.json();
      setReviews(reviewData.reviews ?? []);
      setProfileName(reviewData.profile?.username ?? username);
      setNotFound(Boolean(reviewData.profile && !reviewData.profile.found));
    }

    if (username) {
      bootstrap();
    }
  }, [username]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth");
    router.refresh();
  }

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <TopNav username={user?.username} />

        <section className={styles.panel}>
          <h1 className={styles.title}>Profile @{profileName || username}</h1>
          <p className={styles.subtitle}>Tất cả review của người dùng này sẽ hiển thị ở đây, không cần lọc từ feed cộng đồng.</p>
          <div className={styles.row}>
            <Link className={styles.secondary} href="/reviews">
              Quay lại feed cộng đồng
            </Link>
            <button className={styles.secondary} type="button" onClick={handleLogout}>
              Đăng xuất
            </button>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.stack}`}>
          <div className={styles.feedHeader}>
            <h2>Review của @{profileName || username}</h2>
            <p className={styles.feedMeta}>{reviews.length} bài đánh giá</p>
          </div>

          {notFound ? (
            <p className={styles.empty}>Không tìm thấy người dùng này.</p>
          ) : reviews.length === 0 ? (
            <p className={styles.empty}>Người dùng này chưa có review nào.</p>
          ) : (
            reviews.map((review) => (
              <article key={review.id} className={styles.reviewItem}>
                <div className={styles.reviewTop}>
                  <h3>{review.title}</h3>
                  <span className={styles.statusBadge}>{STATUS_LABEL[review.status]}</span>
                </div>
                <p className={styles.meta}>
                  {review.author} • {"★".repeat(review.rating)}
                </p>
                <p>{review.comment}</p>
                <div className={styles.reviewTop}>
                  <span className={styles.userChip}>@{review.username}</span>
                  <span className={styles.feedMeta}>{new Date(review.createdAt).toLocaleString("vi-VN")}</span>
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
