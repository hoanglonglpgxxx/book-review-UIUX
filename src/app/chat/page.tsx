"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import TopNav from "@/components/TopNav";
import styles from "@/app/app-pages.module.css";

type SessionUser = {
  userId: string;
  email: string;
  username: string;
};

type ChatMessage = {
  id: string;
  username: string;
  text: string;
  createdAt: string;
};

type UserCheckResponse = {
  exists: boolean;
  user?: {
    email: string;
    username: string;
  };
};

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [status, setStatus] = useState("");
  const [hasError, setHasError] = useState(false);

  const [showAddPopup, setShowAddPopup] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [isCheckingUser, setIsCheckingUser] = useState(false);

  async function loadSession() {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    const data = await response.json();
    setUser(data.user ?? null);
  }

  async function loadMessages() {
    const response = await fetch("/api/chat/messages", { cache: "no-store" });
    const data = await response.json();
    setMessages(data.messages ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSession();
    loadMessages();
  }, []);

  useEffect(() => {
    const timer = setInterval(loadMessages, 2500);
    return () => clearInterval(timer);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth");
    router.refresh();
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chatText.trim()) return;
    setHasError(false);

    const response = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: chatText }),
    });

    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error ?? "Failed to send message.");
      setHasError(true);
      return;
    }

    setChatText("");
    setStatus("");
    await loadMessages();
  }

  async function handleCheckEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCheckingUser(true);
    setInviteStatus("");

    const response = await fetch(`/api/users/check?email=${encodeURIComponent(inviteEmail)}`, {
      cache: "no-store",
    });

    const data: UserCheckResponse & { error?: string } = await response.json();
    if (!response.ok) {
      setInviteStatus(data.error ?? "Could not check email.");
      setIsCheckingUser(false);
      return;
    }

    if (data.exists && data.user) {
      setInviteStatus(`Found: ${data.user.username} (${data.user.email})`);
    } else {
      setInviteStatus("This email is not registered.");
    }

    setIsCheckingUser(false);
  }

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <TopNav username={user?.username} pageTitle="COMMUNITY" />

        <section className={`${styles.panel} ${styles.heroPanel}`}>
          <div className={styles.stack}>
            <h1 className={styles.title}>Community Chat</h1>
            <p className={styles.subtitle}>
              Discuss books in real time, find readers by email, and follow the pulse of the community.
            </p>
            <div className={styles.row}>
              <button
                className={styles.primary}
                type="button"
                onClick={() => setShowAddPopup(true)}
                disabled={!user}
              >
                + Invite reader
              </button>
              <button className={styles.secondary} type="button" onClick={handleLogout}>
                Sign out
              </button>
            </div>
            {!user ? (
              <p className={`${styles.status} ${styles.error}`}>Sign in to join the chat.</p>
            ) : null}
            {status ? (
              <p className={`${styles.status} ${styles.statusFull} ${hasError ? styles.error : ""}`}>
                {status}
              </p>
            ) : null}
          </div>

          <div className={styles.metricGrid}>
            <div className={styles.metricCard}>
              <p className={styles.metricLabel}>Recent messages</p>
              <p className={styles.metricValue}>{messages.length}</p>
            </div>
            <div className={styles.metricCard}>
              <p className={styles.metricLabel}>Active readers</p>
              <p className={styles.metricValue}>{user ? "1+" : "0"}</p>
            </div>
            <div className={styles.metricCard}>
              <p className={styles.metricLabel}>Refresh rate</p>
              <p className={styles.metricValue}>2.5s</p>
            </div>
          </div>
        </section>

        <section className={styles.layoutMain}>
          <section className={`${styles.panel} ${styles.stack}`}>
            <h2>Send a message</h2>
            <form className={styles.formInline} onSubmit={handleSendMessage}>
              <input
                className={styles.input}
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder={user ? "Share your thoughts…" : "Sign in to chat"}
                disabled={!user}
                required
              />
              <button className={styles.primary} type="submit" disabled={!user}>
                Send
              </button>
            </form>
          </section>

          <section className={`${styles.panel} ${styles.stack}`}>
            <div className={styles.feedHeader}>
              <h2>Conversation feed</h2>
              <p className={styles.feedMeta}>{messages.length} recent messages</p>
            </div>
            {messages.length === 0 ? (
              <p className={styles.empty}>The channel is quiet…</p>
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={`${styles.messageItem} ${message.username === user?.username ? styles.messageOwn : ""}`}
                >
                  <div className={styles.messageTop}>
                    <span className={styles.userChip}>@{message.username}</span>
                    <span className={styles.feedMeta}>
                      {new Date(message.createdAt).toLocaleTimeString("vi-VN")}
                    </span>
                  </div>
                  <p>{message.text}</p>
                </article>
              ))
            )}
          </section>
        </section>

        {showAddPopup ? (
          <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            onClick={() => setShowAddPopup(false)}
          >
            <section className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Invite a reader</h2>
                <button className={styles.ghost} type="button" onClick={() => setShowAddPopup(false)}>
                  ✕
                </button>
              </div>

              <form className={styles.form} onSubmit={handleCheckEmail}>
                <label>
                  Reader&rsquo;s email
                  <input
                    className={styles.input}
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="friend@email.com"
                  />
                </label>
                <button className={styles.primary} type="submit" disabled={isCheckingUser}>
                  {isCheckingUser ? "Checking…" : "Look up user"}
                </button>
              </form>

              {inviteStatus ? (
                <p className={`${styles.status} ${styles.statusFull}`}>{inviteStatus}</p>
              ) : null}
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
