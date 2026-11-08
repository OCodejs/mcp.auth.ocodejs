import { redirect } from "next/navigation";
import { auth } from "@/auth";
import TokenVaultManager from "@/components/account/TokenVaultManager";

export const dynamic = "force-dynamic";

export default async function AccountKeysPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  return <main style={{ minHeight: "100svh", background: "#000", color: "#f5f5f5", fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
    <header style={{ borderBottom: "1px solid #262626", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <a href="/" aria-label="OCodeJS" style={{ color: "#fff", textDecoration: "none", fontWeight: 700, letterSpacing: "-.06em", fontSize: 20 }}>OCodeJS<span style={{ color: "#777" }}>.</span></a>
      <span style={{ color: "#999", fontSize: 10, letterSpacing: ".12em" }}>SECURE VAULT</span>
    </header>
    <section style={{ width: "min(100% - 40px, 720px)", margin: "0 auto", padding: "42px 0 56px" }}>
      <a href="/account" style={{ color: "#888", fontSize: 10, textDecoration: "none" }}>← TÀI KHOẢN</a>
      <p style={{ color: "#888", fontSize: 10, letterSpacing: ".16em", margin: "22px 0 12px" }}>BYOK / PRIVATE CREDENTIALS</p>
      <h1 style={{ fontSize: 28, letterSpacing: "-.06em", margin: "0 0 12px" }}>API Key Vault</h1>
      <p style={{ color: "#888", fontSize: 12, lineHeight: 1.8, margin: "0 0 28px" }}>Quản lý API key riêng cho tài khoản OCode.js. Secret được lưu ở Token Vault, tách biệt theo user ID; giao diện chỉ nhận metadata, không nhận lại plaintext.</p>
      <TokenVaultManager />
    </section>
    <footer style={{ borderTop: "1px solid #262626", padding: "18px 24px", color: "#666", fontSize: 9, letterSpacing: ".1em", textAlign: "center" }}>© 2026 OCODEJS · SECURE TOKEN VAULT</footer>
  </main>;
}
