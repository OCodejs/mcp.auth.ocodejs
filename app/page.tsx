"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

type Mode = "signin" | "signup";

const googleEnabled = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true";
const githubEnabled = process.env.NEXT_PUBLIC_AUTH_GITHUB_ENABLED === "true";

function GoogleIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 11.1H12v2.98h5.35c-.5 2.4-2.5 3.5-5.35 3.5a5.6 5.6 0 1 1 0-11.2c1.4 0 2.6.5 3.55 1.35l2.1-2.1A8.6 8.6 0 0 0 12 3.4a8.6 8.6 0 1 0 0 17.2c4.95 0 8.6-3.5 8.6-8.4 0-.4-.05-.75-.1-1.1z"/></svg>;
}

function GitHubIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.38-3.88-1.38-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z"/></svg>;
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">{hidden ? <><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10.5 7 10.5 7a17 17 0 0 1-3.1 3.7M6.2 6.2C3.2 8.1 1.5 12 1.5 12s4 7 10.5 7a10 10 0 0 0 3-.45"/></> : <><path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/></>}</svg>;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [updates, setUpdates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (mode === "signup") {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email: email.trim(), password, updates })
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
      if (!result || result.error || !result.ok) throw new Error("Email hoặc mật khẩu chưa chính xác.");
      window.location.assign(result.url || "/account");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Đã xảy ra lỗi. Vui lòng thử lại.");
      setBusy(false);
    }
  }

  async function provider(providerName: "google" | "github") {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await signIn(providerName, { callbackUrl: "/account" });
    } catch {
      setMessage("Không thể kết nối nhà cung cấp. Vui lòng thử lại sau.");
      setBusy(false);
    }
  }

  function changeMode(next: Mode) {
    setMode(next);
    setMessage("");
    setPassword("");
  }

  return (
    <main className="auth-page">
      <div className="auth-wrap">
        <a className="back-link" href="/" aria-label="Về trang chủ"><span aria-hidden="true">‹</span> Home</a>

        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
              <rect x="6" y="6" width="22" height="22" />
              <path d="M13 13h8M13 17h8M13 21h4" />
            </svg>
          </div>
          <div className="brand-name">OCodeJS</div>
        </div>

        <section className="auth-view" aria-labelledby="auth-title">
          <h1 id="auth-title">{mode === "signin" ? "Log in to OCodeJS" : "Create an OCodeJS account"}</h1>
          <p className="auth-subtitle">
            {mode === "signin" ? "Don’t have an account? " : "Already have an account? "}
            <button className="text-link" type="button" onClick={() => changeMode(mode === "signin" ? "signup" : "signin")}>
              {mode === "signin" ? "Sign up" : "Log in"}
            </button>.
          </p>

          {(googleEnabled || githubEnabled) && <div className="oauth-stack">
            {googleEnabled && <button className="oauth-button" type="button" onClick={() => provider("google")} disabled={busy}>
              <GoogleIcon /> {mode === "signin" ? "Log in with Google" : "Sign up with Google"}
            </button>}
            {githubEnabled && <button className="oauth-button" type="button" onClick={() => provider("github")} disabled={busy}>
              <GitHubIcon /> {mode === "signin" ? "Log in with GitHub" : "Sign up with GitHub"}
            </button>}
          </div>}

          {(googleEnabled || githubEnabled) && <div className="or-divider"><span>or</span></div>}

          <form className="auth-form" onSubmit={submit}>
            {mode === "signup" && (
              <div className="field">
                <label htmlFor="s-name">Name</label>
                <input id="s-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name" maxLength={80} required />
              </div>
            )}
            <div className="field">
              <label htmlFor="auth-email">Email</label>
              <input id="auth-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="alan.turing@example.com" autoComplete="email" maxLength={254} required />
            </div>
            <div className="field">
              <label htmlFor="auth-password">Password</label>
              <div className="password-field">
                <input id="auth-password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === "signup" ? "Min. 12 characters" : "Enter your password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={mode === "signup" ? 12 : 1} maxLength={128} required />
                <button className="password-toggle" type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"}><EyeIcon hidden={showPassword} /></button>
              </div>
            </div>
            {mode === "signup" && (
              <label className="updates-check">
                <input type="checkbox" checked={updates} onChange={e => setUpdates(e.target.checked)} />
                <span>Send me occasional updates, guides, and promotions.</span>
              </label>
            )}
            <button className="submit-button" type="submit" disabled={busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length < (mode === "signup" ? 12 : 1) || (mode === "signup" && !name.trim())}>
              {busy ? "Please wait…" : mode === "signin" ? "Log In" : "Create account"}
            </button>
          </form>

          {message && <p className="form-message" role="alert">{message}</p>}

          <p className="legal-copy">
            {mode === "signin" ? "By signing in, you agree to our " : "By signing up, you agree to our "}
            <a href="/terms">Terms</a>{mode === "signup" ? ", " : " and "}
            {mode === "signup" && <><a href="/acceptable-use">Acceptable Use</a>, and </>}
            <a href="/privacy">Privacy Policy</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
