import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <main className="shell">
      <section className="auth-card account-card">
        <div className="brand-mark" aria-hidden="true">V</div>
        <p className="eyebrow">VELCLAW IDENTITY</p>
        <h1>Đăng nhập thành công</h1>
        <p className="subtitle">Danh tính của bạn đã được xác thực.</p>
        <div className="account-detail">
          <span>Tài khoản</span>
          <strong>{session.user.name || "Người dùng Velclaw"}</strong>
          <span>Email</span>
          <strong>{session.user.email || "Không có email"}</strong>
        </div>
        <form action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}>
          <button className="primary" type="submit">Đăng xuất</button>
        </form>
      </section>
      <footer>SECURE ACCESS <span>•</span> VELCLAW PLATFORM</footer>
    </main>
  );
}