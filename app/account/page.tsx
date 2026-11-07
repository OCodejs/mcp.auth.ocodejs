import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

const panelStyle = {
  width: "min(100% - 40px, 420px)",
  margin: "0 auto",
  padding: "48px 0 36px"
} as const;

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <main style={{ minHeight: "100svh", background: "#000", color: "#f5f5f5", fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
      <header style={{ borderBottom: "1px solid #262626", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" aria-label="OCodeJS" style={{ color: "#fff", textDecoration: "none", fontWeight: 700, letterSpacing: "-.06em", fontSize: 20 }}>OCodeJS<span style={{ color: "#777" }}>.</span></a>
        <span style={{ color: "#999", fontSize: 10, letterSpacing: ".12em" }}>ACCOUNT</span>
      </header>
      <section style={panelStyle}>
        <p style={{ color: "#888", fontSize: 10, letterSpacing: ".16em", margin: "0 0 14px" }}>IDENTITY / VERIFIED</p>
        <h1 style={{ fontSize: 25, lineHeight: 1.25, letterSpacing: "-.06em", margin: "0 0 10px" }}>Tài khoản OCodeJS</h1>
        <p style={{ color: "#888", fontSize: 12, lineHeight: 1.8, margin: "0 0 32px" }}>Phiên đăng nhập đang hoạt động. Thông tin tài khoản được hiển thị bên dưới.</p>
        <div style={{ borderTop: "1px solid #292929" }}>
          <div style={{ padding: "18px 0", borderBottom: "1px solid #292929" }}>
            <div style={{ color: "#777", fontSize: 10, marginBottom: 8 }}>TÊN HIỂN THỊ</div>
            <div style={{ fontSize: 13, overflowWrap: "anywhere" }}>{session.user.name || "Người dùng"}</div>
          </div>
          <div style={{ padding: "18px 0", borderBottom: "1px solid #292929" }}>
            <div style={{ color: "#777", fontSize: 10, marginBottom: 8 }}>EMAIL</div>
            <div style={{ fontSize: 13, overflowWrap: "anywhere" }}>{session.user.email || "Chưa cung cấp"}</div>
          </div>
          <div style={{ padding: "18px 0", borderBottom: "1px solid #292929" }}>
            <div style={{ color: "#777", fontSize: 10, marginBottom: 8 }}>TRẠNG THÁI</div>
            <div style={{ color: "#f5f5f5", fontSize: 12 }}>● Đã xác thực</div>
          </div>
        </div>
        <form action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}>
          <button type="submit" style={{ width: "100%", marginTop: 26, minHeight: 48, border: "1px solid #f5f5f5", background: "#f5f5f5", color: "#000", font: "inherit", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>ĐĂNG XUẤT</button>
        </form>
        <a href="/" style={{ display: "block", marginTop: 22, color: "#888", textAlign: "center", fontSize: 10, textDecoration: "none" }}>← QUAY LẠI OCODEJS</a>
      </section>
      <footer style={{ borderTop: "1px solid #262626", padding: "18px 24px", color: "#666", fontSize: 9, letterSpacing: ".1em", textAlign: "center" }}>© 2026 OCODEJS · IDENTITY</footer>
    </main>
  );
}
