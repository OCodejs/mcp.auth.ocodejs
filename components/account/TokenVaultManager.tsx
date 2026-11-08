"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type VaultToken = { id: string; label: string; provider: string; created_at: string };
type Provider = "openai" | "google" | "anthropic" | "custom";
const providers: Array<{ value: Provider; label: string; envNames: string[] }> = [
  { value: "openai", label: "OpenAI", envNames: ["OPENAI_API_KEY"] },
  { value: "google", label: "Google Gemini", envNames: ["GEMINI_API_KEY", "GOOGLE_API_KEY"] },
  { value: "anthropic", label: "Anthropic", envNames: ["ANTHROPIC_API_KEY"] },
  { value: "custom", label: "Custom API", envNames: ["API_KEY", "TOKEN"] }
];

export default function TokenVaultManager() {
  const [tokens, setTokens] = useState<VaultToken[]>([]);
  const [provider, setProvider] = useState<Provider>("openai");
  const [label, setLabel] = useState("My API key");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/vault/tokens", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Load failed");
      setTokens(Array.isArray(data.tokens) ? data.tokens : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải API key.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function importFile(file?: File) {
    if (!file) return;
    setMessage("");
    try {
      const text = await file.text();
      let importedValue = "";
      let importedProvider: Provider | undefined;
      let importedLabel = file.name.replace(/\.(env|json|txt)$/i, "") || "Imported API key";
      if (file.name.toLowerCase().endsWith(".json")) {
        const data = JSON.parse(text) as Record<string, unknown>;
        if (typeof data.apiKey === "string") importedValue = data.apiKey;
        else if (typeof data.api_key === "string") importedValue = data.api_key;
        if (typeof data.provider === "string" && providers.some((p) => p.value === data.provider)) importedProvider = data.provider as Provider;
        if (typeof data.label === "string") importedLabel = data.label.slice(0, 100);
      } else {
        const entries = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
        for (const item of providers) {
          const match = entries.find((line) => item.envNames.some((name) => line.startsWith(name + "=")));
          if (match) {
            importedValue = match.slice(match.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
            importedProvider = item.value;
            break;
          }
        }
      }
      if (!importedValue) throw new Error("Không tìm thấy API key được hỗ trợ trong file.");
      setValue(importedValue);
      setProvider(importedProvider ?? "custom");
      setLabel(importedLabel);
      setMessage("Đã đọc key trong trình duyệt. File gốc không được tải lên.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đọc file.");
    } finally { if (fileRef.current) fileRef.current.value = ""; }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/vault/tokens", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, provider, value: value.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể lưu key.");
      setValue("");
      setMessage("API key đã được gửi vào Token Vault và mã hóa phía máy chủ.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu API key.");
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!window.confirm("Xóa API key này khỏi Token Vault?")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/vault/tokens/" + id, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể xóa key.");
      await refresh(); setMessage("Đã xóa API key.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xóa API key.");
    } finally { setBusy(false); }
  }

  return <div style={{ display: "grid", gap: 28 }}>
    <form onSubmit={save} style={{ border: "1px solid #292929", padding: 20, display: "grid", gap: 14 }}>
      <div><div style={{ fontSize: 10, color: "#888", letterSpacing: ".14em" }}>ADD CREDENTIAL</div>
        <h2 style={{ fontSize: 18, margin: "8px 0 0", letterSpacing: "-.04em" }}>Thêm API key</h2>
        <p style={{ color: "#888", fontSize: 11, lineHeight: 1.7 }}>Key chỉ được gửi qua HTTPS tới server-side API và mã hóa tại Token Vault. Không hiển thị lại sau khi lưu.</p></div>
      <label style={labelStyle}>Nhà cung cấp
        <select value={provider} onChange={(event) => setProvider(event.target.value as Provider)} style={fieldStyle}>
          {providers.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label style={labelStyle}>Tên hiển thị
        <input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={100} required style={fieldStyle} />
      </label>
      <label style={labelStyle}>API key / token
        <input type="password" autoComplete="new-password" spellCheck={false} value={value} onChange={(event) => setValue(event.target.value)} minLength={8} maxLength={8192} required placeholder="Dán key tại đây" style={fieldStyle} />
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button type="submit" disabled={busy || !value.trim()} style={primaryButton}>{busy ? "ĐANG LƯU…" : "LƯU API KEY"}</button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} style={secondaryButton}>NHẬP TỪ FILE</button>
        <input ref={fileRef} type="file" accept=".env,.json,.txt,text/plain,application/json" hidden onChange={(event) => void importFile(event.target.files?.[0])} />
      </div>
      <p style={{ margin: 0, color: "#777", fontSize: 10, lineHeight: 1.7 }}>Hỗ trợ file .env với OPENAI_API_KEY / GEMINI_API_KEY / ANTHROPIC_API_KEY và JSON có các trường provider, apiKey, label. File được đọc cục bộ trong trình duyệt; chỉ giá trị key đã chọn được gửi đi.</p>
      {message && <p role="status" aria-live="polite" style={{ margin: 0, color: "#b8c8ff", fontSize: 11 }}>{message}</p>}
    </form>
    <section style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div><div style={{ fontSize: 10, color: "#888", letterSpacing: ".14em" }}>SAVED CREDENTIALS</div><h2 style={{ fontSize: 18, margin: "8px 0 0" }}>API keys của bạn</h2></div>
        <button type="button" onClick={() => void refresh()} disabled={loading} style={secondaryButton}>LÀM MỚI</button>
      </div>
      {loading ? <p style={{ color: "#777", fontSize: 12 }}>Đang tải…</p> : tokens.length === 0 ?
        <p style={{ border: "1px dashed #333", padding: 18, color: "#777", fontSize: 12 }}>Chưa có API key nào được lưu.</p> :
        tokens.map((token) => <article key={token.id} style={{ border: "1px solid #292929", padding: 16, display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center" }}>
          <div style={{ minWidth: 0 }}><div style={{ fontSize: 12, color: "#f5f5f5", overflowWrap: "anywhere" }}>{token.label}</div>
            <div style={{ color: "#888", fontSize: 10, marginTop: 6 }}>{token.provider.toUpperCase()} · {new Date(token.created_at).toLocaleDateString()}</div>
            <div style={{ color: "#666", fontSize: 10, marginTop: 5 }}>•••••••••••• · Không thể xem lại key</div></div>
          <button type="button" onClick={() => void remove(token.id)} disabled={busy} style={dangerButton}>XÓA</button>
        </article>)}
    </section>
  </div>;
}

const labelStyle: React.CSSProperties = { display: "grid", gap: 7, color: "#aaa", fontSize: 11 };
const fieldStyle: React.CSSProperties = { width: "100%", minHeight: 44, boxSizing: "border-box", border: "1px solid #333", background: "#080808", color: "#f5f5f5", padding: "0 12px", font: "inherit", fontSize: 12, borderRadius: 0 };
const primaryButton: React.CSSProperties = { minHeight: 42, border: "1px solid #f5f5f5", background: "#f5f5f5", color: "#000", padding: "0 16px", font: "inherit", fontSize: 10, fontWeight: 700, cursor: "pointer" };
const secondaryButton: React.CSSProperties = { minHeight: 42, border: "1px solid #444", background: "transparent", color: "#ddd", padding: "0 14px", font: "inherit", fontSize: 10, cursor: "pointer" };
const dangerButton: React.CSSProperties = { minHeight: 34, border: "1px solid #633", background: "transparent", color: "#f99", padding: "0 12px", font: "inherit", fontSize: 10, cursor: "pointer" };
