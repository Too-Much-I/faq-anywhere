import { useState, useEffect, useCallback } from "react";

type Faq = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  isActive: boolean;
  createdAt: string;
};

type FaqForm = {
  question: string;
  answer: string;
  category: string;
};

const EMPTY_FORM: FaqForm = { question: "", answer: "", category: "" };

function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("token");
  return fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") ?? "");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [form, setForm] = useState<FaqForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchFaqs = useCallback(async () => {
    const res = await apiFetch("/admin/faqs");
    if (res.ok) setFaqs(await res.json());
  }, []);

  useEffect(() => {
    if (token) fetchFaqs();
  }, [token, fetchFaqs]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const { token: t } = await res.json();
      localStorage.setItem("token", t);
      setToken(t);
    } else {
      setLoginError("비밀번호가 올바르지 않습니다.");
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setToken("");
    setFaqs([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body = {
        question: form.question,
        answer: form.answer,
        ...(form.category && { category: form.category }),
      };

      if (editingId) {
        await apiFetch(`/admin/faqs/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/admin/faqs", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }

      setForm(EMPTY_FORM);
      setEditingId(null);
      await fetchFaqs();
    } catch {
      setError("저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await apiFetch(`/admin/faqs/${id}`, { method: "DELETE" });
    await fetchFaqs();
  }

  function handleEdit(faq: Faq) {
    setEditingId(faq.id);
    setForm({ question: faq.question, answer: faq.answer, category: faq.category ?? "" });
  }

  if (!token) {
    return (
      <div style={styles.center}>
        <div style={styles.loginBox}>
          <h1 style={styles.title}>FAQ Anywhere</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Admin 비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
            {loginError && <p style={styles.error}>{loginError}</p>}
            <button type="submit" style={styles.btn}>로그인</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>FAQ Anywhere</h1>
        <button onClick={handleLogout} style={styles.btnSecondary}>로그아웃</button>
      </header>

      <section style={styles.formSection}>
        <h2>{editingId ? "FAQ 수정" : "FAQ 추가"}</h2>
        <form onSubmit={handleSubmit}>
          <input
            placeholder="질문"
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            style={styles.input}
            required
          />
          <textarea
            placeholder="답변"
            value={form.answer}
            onChange={(e) => setForm({ ...form, answer: e.target.value })}
            style={{ ...styles.input, height: 80 }}
            required
          />
          <input
            placeholder="카테고리 (선택)"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            style={styles.input}
          />
          {error && <p style={styles.error}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" style={styles.btn} disabled={loading}>
              {loading ? "저장 중..." : editingId ? "수정" : "추가"}
            </button>
            {editingId && (
              <button
                type="button"
                style={styles.btnSecondary}
                onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }}
              >
                취소
              </button>
            )}
          </div>
        </form>
      </section>

      <section>
        <h2>FAQ 목록 ({faqs.length}개)</h2>
        {faqs.map((faq) => (
          <div key={faq.id} style={styles.card}>
            <p style={{ fontWeight: "bold", margin: "0 0 4px" }}>Q. {faq.question}</p>
            <p style={{ margin: "0 0 4px", color: "#444" }}>{faq.answer}</p>
            {faq.category && <span style={styles.badge}>{faq.category}</span>}
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button onClick={() => handleEdit(faq)} style={styles.btnSmall}>수정</button>
              <button onClick={() => handleDelete(faq.id)} style={{ ...styles.btnSmall, color: "#c00" }}>삭제</button>
            </div>
          </div>
        ))}
        {faqs.length === 0 && <p style={{ color: "#888" }}>등록된 FAQ가 없습니다.</p>}
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  center: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f5f5f5" },
  loginBox: { background: "#fff", padding: 32, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", width: 320 },
  container: { maxWidth: 720, margin: "0 auto", padding: "24px 16px", fontFamily: "sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { margin: 0, fontSize: 22 },
  formSection: { background: "#f9f9f9", padding: 16, borderRadius: 8, marginBottom: 24 },
  input: { display: "block", width: "100%", padding: "8px 10px", marginBottom: 8, border: "1px solid #ddd", borderRadius: 4, boxSizing: "border-box", fontSize: 14 },
  btn: { padding: "8px 20px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 14 },
  btnSecondary: { padding: "8px 16px", background: "#e5e7eb", color: "#333", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 14 },
  btnSmall: { padding: "4px 12px", background: "none", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", fontSize: 13 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 12 },
  badge: { display: "inline-block", padding: "2px 8px", background: "#e0e7ff", color: "#3730a3", borderRadius: 12, fontSize: 12 },
  error: { color: "#c00", fontSize: 13, margin: "4px 0" },
};
