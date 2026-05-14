"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import TopNav from "@/components/TopNav";

type SessionUser = {
  userId: string;
  email: string;
  username: string;
};

type Todo = {
  id: string;
  title: string;
  description: string;
  dueAt: string | null;
  completed: boolean;
  emailSent: boolean;
  createdAt: string;
};

function toDateTimeLocalValue(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const offset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

function statusBadge(todo: Todo) {
  if (todo.completed) return "✅ Xong";
  if (todo.emailSent) return "📧 Đã gửi email";
  if (todo.dueAt) return "⏳ Chờ";
  return "";
}

export default function TodosPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDueAt, setNewDueAt] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDueAt, setEditDueAt] = useState("");

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
    fetch("/api/todos")
      .then((r) => r.json())
      .then((data) => { setTodos(data.todos ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        dueAt: newDueAt ? new Date(newDueAt).toISOString() : null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setTodos((prev) => [data.todo, ...prev]);
      setNewTitle("");
      setNewDesc("");
      setNewDueAt("");
    }
    setCreating(false);
  }

  async function handleComplete(id: string) {
    const res = await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    const data = await res.json();
    if (res.ok) setTodos((prev) => prev.map((t) => (t.id === id ? data.todo : t)));
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
    if (res.ok) setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function startEdit(todo: Todo) {
    setEditId(todo.id);
    setEditTitle(todo.title);
    setEditDesc(todo.description);
    setEditDueAt(toDateTimeLocalValue(todo.dueAt));
  }

  async function handleSaveEdit(id: string) {
    const res = await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
        dueAt: editDueAt ? new Date(editDueAt).toISOString() : null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setTodos((prev) => prev.map((t) => (t.id === id ? data.todo : t)));
      setEditId(null);
    }
  }

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopNav username={user.username} pageTitle="TODOS" />

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 16px", width: "100%" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Danh sách công việc</h1>

        {/* Create form */}
        <form
          onSubmit={handleCreate}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 36,
            padding: 20,
            border: "1px solid var(--card-border)",
            borderRadius: 10,
            background: "var(--card-bg)",
          }}
        >
          <input
            type="text"
            placeholder="Tiêu đề công việc *"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            maxLength={200}
            style={inputStyle}
          />
          <textarea
            placeholder="Mô tả (tuỳ chọn)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            maxLength={1000}
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
          <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Nhắc nhở lúc (tuỳ chọn)
            <input
              type="datetime-local"
              value={newDueAt}
              onChange={(e) => setNewDueAt(e.target.value)}
              style={{ ...inputStyle, marginTop: 4 }}
            />
          </label>
          <button type="submit" disabled={creating} style={btnPrimaryStyle}>
            {creating ? "Đang thêm…" : "+ Thêm công việc"}
          </button>
        </form>

        {/* Todo list */}
        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Đang tải…</p>
        ) : todos.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Chưa có công việc nào.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {todos.map((todo) =>
              editId === todo.id ? (
                <li key={todo.id} style={cardStyle}>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    maxLength={200}
                    style={{ ...inputStyle, marginBottom: 8 }}
                  />
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    maxLength={1000}
                    rows={2}
                    style={{ ...inputStyle, resize: "vertical", marginBottom: 8 }}
                  />
                  <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 12 }}>
                    Nhắc nhở lúc
                    <input
                      type="datetime-local"
                      value={editDueAt}
                      onChange={(e) => setEditDueAt(e.target.value)}
                      style={{ ...inputStyle, marginTop: 4 }}
                    />
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleSaveEdit(todo.id)} style={btnPrimaryStyle}>Lưu</button>
                    <button onClick={() => setEditId(null)} style={btnSecondaryStyle}>Huỷ</button>
                  </div>
                </li>
              ) : (
                <li key={todo.id} style={{ ...cardStyle, opacity: todo.completed ? 0.6 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, textDecoration: todo.completed ? "line-through" : "none" }}>
                        {todo.title}
                      </span>
                      {todo.description && (
                        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>{todo.description}</p>
                      )}
                      {todo.dueAt && (
                        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                          ⏰ {new Date(todo.dueAt).toLocaleString("vi-VN")}
                          {" "}
                          <span style={{ fontWeight: 600 }}>{statusBadge(todo)}</span>
                        </p>
                      )}
                      {!todo.dueAt && todo.completed && (
                        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>✅ Xong</p>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {!todo.completed && (
                        <button onClick={() => handleComplete(todo.id)} style={btnSmallGreenStyle}>Hoàn thành</button>
                      )}
                      <button onClick={() => startEdit(todo)} style={btnSmallStyle}>Sửa</button>
                      <button onClick={() => handleDelete(todo.id)} style={btnSmallDangerStyle}>Xóa</button>
                    </div>
                  </div>
                </li>
              )
            )}
          </ul>
        )}
      </main>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--card-border)",
  background: "var(--input-bg, var(--card-bg))",
  color: "var(--text-primary)",
  fontSize: 14,
  boxSizing: "border-box",
};

const cardStyle: React.CSSProperties = {
  padding: 16,
  border: "1px solid var(--card-border)",
  borderRadius: 10,
  background: "var(--card-bg)",
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 6,
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const btnSecondaryStyle: React.CSSProperties = {
  ...btnPrimaryStyle,
  background: "var(--card-border)",
  color: "var(--text-primary)",
};

const btnSmallStyle: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: 5,
  border: "1px solid var(--card-border)",
  background: "transparent",
  color: "var(--text-primary)",
  fontSize: 12,
  cursor: "pointer",
};

const btnSmallGreenStyle: React.CSSProperties = {
  ...btnSmallStyle,
  background: "#22c55e",
  color: "#fff",
  border: "none",
};

const btnSmallDangerStyle: React.CSSProperties = {
  ...btnSmallStyle,
  background: "#ef4444",
  color: "#fff",
  border: "none",
};
