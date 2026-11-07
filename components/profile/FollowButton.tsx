"use client";
import { useState } from "react";
export default function FollowButton({ username, initialFollowing = false }: { username: string; initialFollowing?: boolean }) {
  const [following, setFollowing] = useState(initialFollowing); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function toggle() {
    if (busy) return; setBusy(true); setError("");
    try {
      const response = await fetch(`/api/profiles/${encodeURIComponent(username)}/follow`, { method: following ? "DELETE" : "POST" });
      const data = await response.json();
      if (response.status === 401) { window.location.assign("/"); return; }
      if (!response.ok) throw new Error(data.error || "Không thể cập nhật theo dõi.");
      setFollowing(Boolean(data.following));
    } catch (e) { setError(e instanceof Error ? e.message : "Có lỗi xảy ra."); }
    finally { setBusy(false); }
  }
  return <div><button type="button" onClick={toggle} disabled={busy} style={{ width: "100%", padding: "10px 12px", border: "1px solid #444", background: following ? "#111" : "#f5f5f5", color: following ? "#eee" : "#000", fontSize: 11, fontWeight: 700 }}>{busy ? "…" : following ? "FOLLOWING · CLICK TO UNFOLLOW" : "FOLLOW"}</button>{error && <p role="status" style={{ color: "#e6a0a0", fontSize: 10 }}>{error}</p>}</div>;
}
