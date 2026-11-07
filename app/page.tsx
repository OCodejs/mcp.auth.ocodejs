"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

type Mode = "signin" | "signup";

export default function Home() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "signup") {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Đăng ký thất bại.");
      }
      const result = await signIn("credentials", {
        email, password, redirect: true, callbackUrl: "/account"
      });
      if (result?.error) throw new Error("Email hoặc mật khẩu không chính xác.");
      setMessage(mode === "signup" ? "Tài khoản đã tạo. Cần cấu hình trang ứng dụng sau đăng nhập." : "Đăng nhập thành công.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Có lỗi xảy ra.");
    } finally {
      setBusy(false);
    }
  }

  async function provider(providerName: "google" | "github") {
    setBusy(true);
    setMessage("");
    try {
      await signIn(providerName, { callbackUrl: "/account" });
    } catch {
      setMessage("Không thể bắt đầu OAuth. Hãy kiểm tra biến môi trường của provider.");
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <section className="auth-card" aria-labelledby="page-title">
        <div className="brand-mark" aria-hidden="true">V</div>
        <p className="eyebrow">VELCLAW IDENTITY</p>
        <h1 id="page-title">{mode === "signin" ? "Chào mừng trở lại" : "Tạo tài khoản"}</h1>
        <p className="subtitle">Một danh tính. Toàn bộ hệ sinh thái Velclaw.</p>

        <div className="providers">
          <button type="button" className="provider" onClick={() => provider("google")} disabled={busy}>
            <span className="google-icon">G</span> Tiếp tục với Google
          </button>
          <button type="button" className="provider" onClick={() => provider("github")} disabled={busy}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.54v-2.1c-3.1.67-3.76-1.32-3.76-1.32-.5-1.28-1.23-1.62-1.23-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.7 1.15 1.7 1.15.99 1.69 2.6 1.2 3.23.91.1-.72.39-1.2.7-1.48-2.47-.28-5.07-1.24-5.07-5.5 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.06 1.15a10.6 10.6 0 0 1 5.57 0c2.13-1.45 3.06-1.15 3.06-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.27-2.6 5.22-5.08 5.5.4.34.75 1.02.75 2.06v3.08c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z"/></svg>
            Tiếp tục với GitHub
          </button>
        </div>

        <div className="separator"><span>hoặc dùng email</span></div>

        <form onSubmit={submit}>
          {mode === "signup" && (
            <label>Họ tên
              <input value={name} onChange={e => setName(e.target.value)} autoComplete="name" required maxLength={80} />
            </label>
          )}
          <label>Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required maxLength={254} />
          </label>
          <label>Mật khẩu
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 12 : 1} maxLength={128} />
            {mode === "signup" && <small>Tối thiểu 12 ký tự.</small>}
          </label>
          <button className="primary" type="submit" disabled={busy}>{busy ? "Đang xử lý…" : mode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}</button>
        </form>

        {message && <p className="notice" role="status">{message}</p>}
        <p className="switch-mode">
          {mode === "signin" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
          <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>
            {mode === "signin" ? "Đăng ký" : "Đăng nhập"}
          </button>
        </p>
        <p className="legal">Tiếp tục đồng nghĩa với việc bạn chấp nhận các điều khoản và chính sách quyền riêng tư.</p>
      </section>
      <footer>SECURE ACCESS <span>•</span> VELCLAW PLATFORM</footer>
    </main>
  );
}