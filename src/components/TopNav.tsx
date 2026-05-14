"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import styles from "@/app/app-pages.module.css";

type TopNavProps = {
  username?: string | null;
  pageTitle?: string;
};

export default function TopNav({ username, pageTitle = "DISCOVER" }: TopNavProps) {
  const pathname = usePathname();
  const profileHref = username ? `/profile/${encodeURIComponent(username)}` : "/auth";

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const saved = window.localStorage.getItem("book-review-theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("book-review-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.brandRow}>
        <img src="/logo.svg" className={styles.brandMark} alt="Book Review logo" />
      </div>

      <nav className={styles.nav}>
        <Link
          className={`${styles.navLink} ${pathname === "/reviews" ? styles.navActive : ""}`}
          href="/reviews"
        >
          Discover
        </Link>
        <Link
          className={`${styles.navLink} ${pathname === "/shelf" ? styles.navActive : ""}`}
          href="/shelf"
        >
          Shelf
        </Link>
        <Link
          className={`${styles.navLink} ${pathname === "/stats" ? styles.navActive : ""}`}
          href="/stats"
        >
          Stats
        </Link>
        <Link
          className={`${styles.navLink} ${pathname === "/chat" ? styles.navActive : ""}`}
          href="/chat"
        >
          Community
        </Link>
        <Link
          className={`${styles.navLink} ${pathname === "/todos" ? styles.navActive : ""}`}
          href="/todos"
        >
          Todos
        </Link>
        <Link
          className={`${styles.navLink} ${pathname === "/auth" || pathname.startsWith("/profile") ? styles.navActive : ""}`}
          href={profileHref}
        >
          {username ? "Profile" : "Login"}
        </Link>
      </nav>

      <div className={styles.pageTitleBar}>
        <span className={styles.pageDivider} aria-hidden="true">|</span>
        <span className={styles.pageTitle}>{pageTitle}</span>
      </div>

      <div className={styles.topbarRight}>
        {username && <span className={styles.meta}>{username}</span>}
        <button
          type="button"
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label={theme === "light" ? "Dark mode" : "Light mode"}
        >
          {theme === "light" ? (
            <svg className={styles.themeIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg className={styles.themeIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3v2M12 19v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M3 12h2M19 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41M12 17a5 5 0 100-10 5 5 0 000 10z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
