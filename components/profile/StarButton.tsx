"use client";
import { useEffect, useState } from "react";
export default function StarButton({ resourceId }: { resourceId: string }) {
  const [starred, setStarred] = useState(false); const [ready, setReady] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/profile/stars", { cache: "no-store" }).then(async r => r.ok ? r.json() : null).then(data => {
      if (live && data) setStarred(data.stars.some((s: { resourceType: string; resourceId: string }) => s.resourceType === "github_repository" && s.resourceId.toLowerCase() === resourceId.toLowerCase()));
    }).catch(() => {}).finally(() => live && setReady(true));
    return () => { live = false; };
  }, [resourceId]);
  async function toggle() {
    if (busy) return; setBusy(true);
    try {
      const response = await fetch("/api/profile/stars", { method: starred ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceType: "github_repository", resourceId }) });
      if (response.status === 401) { window.location.assign("/"); return; }
      if (!response.ok) throw new Error("Unable to update star.");
      setStarred(!starred);
    } catch { /* Preserve current state on failure. */ }
    finally { setBusy(false); }
  }
  return <button type="button" onClick={toggle} disabled={busy || !ready} aria-pressed={starred} style={{ border: "1px solid #333", background: "transparent", color: starred ? "#f5d77a" : "#aaa", padding: "5px 8px", fontSize: 10 }}>{busy ? "…" : starred ? "★ Starred" : "☆ Star"}</button>;
}
