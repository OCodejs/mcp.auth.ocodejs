"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

type Mode = "signin" | "signup";

function BrandMark() {
  return <div className="brand-mark" aria-hidden="true"><svg viewBox="0 0 36 36"><path d="M7 27V9h5l6 9 6-9h5v18h-5V17l-6 9-6-9v10z" fill="currentColor"/></svg></div>;
}

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.72-.06-1.42-.18-2.1H12v3.97h5.38a4.6 4.6 0 0 1-2 3.02v2.46h3.24c1.9-1.75 2.98-4.33 2.98-7.35Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.42l-3.24-2.46c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.75-5.6-4.1H3.05v2.54A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.98a6 6 0 0 1 0-3.96V7.48H3.05a10 10 0 0 0 0 9.04l3.35-2.54Z"/><path fill="#EA4335" d="M12 5.92c1.47 0 2.78.5 3.82 1.5l2.87-2.87C16.96 2.9 14.7 2 12 2a10 10 0 0 0-8.95 5.48L6.4 10.02c.8-2.35 3-4.1 5.6-4.1Z"/></svg>;
}

function GitHubIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.54v-2.1c-3.1.67-3.76-1.32-3.76-1.32-.5-1.28-1.23-1.62-1.23-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.7 1.15 1.7 1.15.99 1.69 2.6 1.2 3.23.91.1-.72.39-1.2.7-1.48-2.47-.28-5.07-1.24-5.07-5.5 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.06 1.15a10.6 10.6 0 0 1 5.57 0c2.13-1.45 3.06-1.15 3.06-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.27-2.6 5.22-5.08 5.5.4.34.75 1.02.75 2.06v3.08c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z"/></svg>;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        if (!response.ok) throw new Error(result.error ?? "Không thể tạo tài khoản. Vui lòng thử lại.");
      }

      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl: "/account"
      });

      if (!result || result.error || !result.ok) {
        throw new Error("Email hoặc mật khẩu chưa chính xác.");
      }
      window.location.assign(result.url || "/account");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Đã xảy ra lỗi. Vui lòng thử lại.");
      setBusy(false);
    }
  }

  async function provider(providerName: "google" | "github") {
    setBusy(true);
    setMessage("");
    try {
      await signIn(providerName, { callbackUrl: "/account" });
    } catch {
      setMessage("Không thể kết nối nhà cung cấp. Vui lòng thử lại sau.");
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <header className="topbar">
        <a className="brand-lockup" href="/" aria-label="MCP Server Auth trang chủ">
          <BrandMark />
          <span>MCP<span className="brand-dot">.</span>AUTH</span>
        </a>
        <div className="topbar-right"><span className="topbar-status"><i /> Hệ thống xác thực</span><span className="topbar-divider" /><span className="topbar-version">IDENTITY PORTAL</span></div>
      </header>

      <div className="auth-layout">
        <section className="intro-panel" aria-label="Giới thiệu dịch vụ">
          <div className="intro-content">
            <div className="system-label"><span className="system-label-line" /> SECURE IDENTITY INFRASTRUCTURE</div>
            <h1>Một danh tính.<br /><span>Mọi kết nối.</span></h1>
            <p className="intro-copy">Truy cập các dịch vụ và công cụ của bạn thông qua một lớp xác thực thống nhất, an toàn và đáng tin cậy.</p>
            <div className="feature-list">
              <div className="feature-item"><span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M12 3 19 6v5c0 4.6-2.9 8.2-7 10-4.1-1.8-7-5.4-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/></svg></span><span><strong>Bảo mật nhiều lớp</strong><small>Bảo vệ phiên đăng nhập và dữ liệu tài khoản</small></span></div>
              <div className="feature-item"><span className="feature-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5s-1.1 6.2-3.3 8.5c-2.2-2.3-3.3-5.1-3.3-8.5s1.1-6.2 3.3-8.5Z"/></svg></span><span><strong>Truy cập tập trung</strong><small>Một tài khoản cho hệ sinh thái dịch vụ</small></span></div>
              <div className="feature-item"><span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m4.5 7.8 7.5 4.4 7.5-4.4M12 12.2V21"/></svg></span><span><strong>Sẵn sàng tích hợp</strong><small>OAuth và email/password trong cùng một cổng</small></span></div>
            </div>
          </div>
          <div className="intro-bottom"><span>DESIGNED FOR SECURE WORKFLOWS</span><span>01 — 03</span></div>
          <div className="orb orb-one" /><div className="orb orb-two" />
        </section>

        <section className="form-panel" aria-labelledby="form-title">
          <div className="form-card">
            <div className="mobile-brand"><BrandMark /><span>MCP<span className="brand-dot">.</span>AUTH</span></div>
            <div className="form-heading">
              <div className="form-kicker">{mode === "signin" ? "ACCOUNT ACCESS" : "NEW ACCOUNT"}</div>
              <h2 id="form-title">{mode === "signin" ? "Chào mừng trở lại" : "Tạo tài khoản mới"}</h2>
              <p>{mode === "signin" ? "Đăng nhập để tiếp tục đến không gian làm việc." : "Thiết lập danh tính để bắt đầu sử dụng dịch vụ."}</p>
            </div>

            <div className="mode-switch" role="tablist" aria-label="Loại tài khoản">
              <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); setMessage(""); }}>Đăng nhập</button>
              <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setMessage(""); }}>Đăng ký</button>
            </div>

            <div className="social-grid">
              <button type="button" className="social-button" onClick={() => provider("google")} disabled={busy}><GoogleIcon /><span>Google</span></button>
              <button type="button" className="social-button" onClick={() => provider("github")} disabled={busy}><GitHubIcon /><span>GitHub</span></button>
            </div>

            <div className="form-divider"><span>HOẶC TIẾP TỤC BẰNG EMAIL</span></div>

            <form className="credentials-form" onSubmit={submit}>
              {mode === "signup" && <label className="field"><span>Họ và tên</span><input value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Tên hiển thị của bạn" required maxLength={80} /></label>}
              <label className="field"><span>Địa chỉ email</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="name@example.com" required maxLength={254} /></label>
              <label className="field"><span>Mật khẩu</span><div className="password-wrap"><input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="Nhập mật khẩu" required minLength={mode === "signup" ? 12 : 1} maxLength={128} /><button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{showPassword ? "Ẩn" : "Hiện"}</button></div>{mode === "signup" && <small className="field-hint">Sử dụng tối thiểu 12 ký tự.</small>}</label>
              <button className="submit-button" type="submit" disabled={busy}><span>{busy ? "Đang xử lý…" : mode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button>
            </form>

            {message && <p className="form-alert" role="alert">{message}</p>}
            <p className="form-legal">Bằng việc tiếp tục, bạn đồng ý với <a href="/terms">Điều khoản dịch vụ</a> và <a href="/privacy">Chính sách quyền riêng tư</a>.</p>
            <div className="security-note"><span className="lock-icon"><svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v3"/></svg></span><span>Kết nối được bảo vệ bằng mã hóa TLS</span><span className="security-dot" /></div>
          </div>
        </section>
      </div>

      <footer className="page-footer"><span>© 2026 MCP.AUTH</span><span>SECURE BY DESIGN <i /> BUILT FOR DEVELOPERS</span><a href="mailto:support@example.com">HỖ TRỢ</a></footer>
    </main>
  );
}
