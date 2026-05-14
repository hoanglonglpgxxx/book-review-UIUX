"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import TopNav from "@/components/TopNav";
import styles from "@/app/app-pages.module.css";

export default function AuthPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  const siteKey = typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "") : "";

  const title = useMemo(() => (activeTab === "login" ? "Sign in" : "Create account"), [activeTab]);

  useEffect(() => {
    // Make callback available globally for Turnstile
    window.onTurnstileSuccess = (token: string) => {
      setTurnstileToken(token);
    };
  }, []);

  // No-op effect to ensure client-side callbacks are attached after mount
  useEffect(() => {}, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");
    setHasError(false);

    const endpoint = activeTab === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload: Record<string, string> = { email, password, turnstileToken };
    if (activeTab === "register") payload.username = username;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error ?? "Authentication failed.");
      setHasError(true);
      setIsSubmitting(false);
      return;
    }

    setStatus("Success! Redirecting…");
    setPassword("");
    router.push("/reviews");
    router.refresh();
  }

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <TopNav pageTitle="WELCOME" />

        <section className={styles.authStage}>
          {/* Left: editorial showcase */}
          <article className={styles.authShowcase}>
            <div>
              <h1 className={styles.authShowcaseTitle}>Book&nbsp;Review Hub</h1>
              <p className={styles.authShowcaseSub}>
                Discover, review, and discuss books with a community of passionate readers.
              </p>
              <div className={styles.authShowcaseFeatures}>
                <div className={styles.authFeatureItem}>
                  <span className={styles.authFeatureDot} />
                  Track your reading progress &amp; write reviews
                </div>
                <div className={styles.authFeatureItem}>
                  <span className={styles.authFeatureDot} />
                  Follow other readers&rsquo; profiles
                </div>
                <div className={styles.authFeatureItem}>
                  <span className={styles.authFeatureDot} />
                  Real-time community chat
                </div>
              </div>
            </div>
          </article>

          {/* Right: login / register form */}
          <article className={styles.authFormPanel}>
            <div className={styles.authHeader}>
              <h2>{activeTab === "login" ? "Welcome back" : "Join the community"}</h2>
              <p>
                {activeTab === "login"
                  ? "Sign in to continue to your bookshelf."
                  : "Create a free account to start reviewing."}
              </p>
            </div>

            <div className={styles.pills}>
              <button
                className={`${styles.secondary} ${activeTab === "login" ? styles.pillActive : ""}`}
                type="button"
                onClick={() => setActiveTab("login")}
              >
                Sign in
              </button>
              <button
                className={`${styles.ghost} ${activeTab === "register" ? styles.pillActive : ""}`}
                type="button"
                onClick={() => setActiveTab("register")}
              >
                Register
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <label>
                Email
                <input
                  className={styles.input}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>

              {activeTab === "register" ? (
                <label>
                  Display name
                  <input
                    className={styles.input}
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. Alex"
                  />
                </label>
              ) : null}

              <label>
                Password
                <input
                  className={styles.input}
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              {siteKey ? (
                <div
                  className="cf-turnstile"
                  data-sitekey={siteKey}
                  data-callback="onTurnstileSuccess"
                  data-theme="light"
                  data-size="normal"
                ></div>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  Captcha unavailable (missing site key).
                </p>
              )}

              <button className={styles.primary} type="submit" disabled={isSubmitting || !turnstileToken}>
                {isSubmitting ? "Please wait…" : title}
              </button>
            </form>

            {status ? (
              <p className={`${styles.status} ${styles.statusFull} ${hasError ? styles.error : ""}`}>
                {status}
              </p>
            ) : null}
          </article>
        </section>
      </main>
    </div>
  );
}
