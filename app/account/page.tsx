import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <main className="auth-shell">
      <header className="topbar">
        <a className="brand-lockup" href="/" aria-label="MCP Auth"><span className="brand-mark" aria-hidden="true">M</span><span>MCP<span className="brand-dot">.</span>AUTH</span></a>
        <div className="topbar-right"><span className="topbar-status"><i /> Phiên đăng nhập đang hoạt động</span></div>
      </header>
      <div className="auth-layout account-layout">
        <section className="intro-panel">
          <div className="intro-content">
            <div className="system-label"><span className="system-label-line" /> IDENTITY VERIFIED</div>
            <h1>Danh tính của bạn.<br /><span>Được bảo vệ.</span></h1>
            <p className="intro-copy">Bạn đã đăng nhập thành công vào cổng xác thực MCP. Phiên làm việc hiện tại đã được xác thực.</p>
          </div>
          <div className="intro-bottom"><span>SECURE IDENTITY INFRASTRUCTURE</span><span>ACCESS GRANTED</span></div>
        </section>
        <section className="form-panel">
          <div className="form-card">
            <div className="form-kicker">ACCOUNT OVERVIEW</div>
            <h2 className="account-title">Tài khoản của bạn</h2>
            <p className="account-subtitle">Thông tin danh tính đang hoạt động.</p>
            <div className="account-detail">
              <span>Tên hiển thị</span><strong>{session.user.name || "Người dùng"}</strong>
              <span>Địa chỉ email</span><strong>{session.user.email || "Chưa cung cấp"}</strong>
              <span>Trạng thái</span><strong className="account-active">Đã xác thực</strong>
            </div>
            <form action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}>
              <button className="submit-button account-logout" type="submit">Đăng xuất khỏi tài khoản</button>
            </form>
            <div className="security-note"><span className="lock-icon">●</span><span>Phiên đăng nhập được quản lý an toàn</span><span className="security-dot" /></div>
          </div>
        </section>
      </div>
      <footer className="page-footer"><span>© 2026 MCP.AUTH</span><span>SECURE BY DESIGN</span><a href="/">TRANG ĐĂNG NHẬP</a></footer>
    </main>
  );
}
