import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import FollowButton from "@/components/profile/FollowButton";
import StarButton from "@/components/profile/StarButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const linkStyle = { color: "#b8c9ed", textDecoration: "none" } as const;
const panel = { border: "1px solid #262626", padding: 20, marginBottom: 16, background: "#080808" } as const;

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await prisma.profile.findFirst({ where: { username: username.toLowerCase(), isPublic: true }, include: {
    _count: { select: { followers: true, following: true, stars: true } },
    links: { orderBy: { sortOrder: "asc" } },
    stars: { orderBy: { createdAt: "desc" }, take: 6 },
    activities: { where: { isPublic: true }, orderBy: { createdAt: "desc" }, take: 8 }
  } });
  if (!profile) notFound();

  let githubRepos: any[] = [];
  let githubEvents: any[] = [];
  if (profile.githubUsername) {
    try {
      const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "OCodeJS-Profile" };
      const [reposResponse, eventsResponse] = await Promise.all([
        fetch(`https://api.github.com/users/${encodeURIComponent(profile.githubUsername)}/repos?sort=updated&per_page=6&type=owner`, { headers, next: { revalidate: 300 }, signal: AbortSignal.timeout(6000) }),
        fetch(`https://api.github.com/users/${encodeURIComponent(profile.githubUsername)}/events/public?per_page=10`, { headers, next: { revalidate: 300 }, signal: AbortSignal.timeout(6000) })
      ]);
      if (reposResponse.ok) githubRepos = await reposResponse.json();
      if (eventsResponse.ok) githubEvents = await eventsResponse.json();
    } catch { githubRepos = []; githubEvents = []; }
  }

  const session = await auth();
  const viewerProfile = session?.user?.id ? await prisma.profile.findUnique({ where: { userId: session.user.id }, select: { id: true } }) : null;
  const isOwnProfile = viewerProfile?.id === profile.id;
  const initialFollowing = viewerProfile && !isOwnProfile ? Boolean(await prisma.profileFollow.findFirst({ where: { followerId: viewerProfile.id, followedId: profile.id }, select: { id: true } })) : false;
  const displayName = profile.displayName || profile.username;
  const tabs = ["Overview", "Repositories", "Projects", "Packages", "Stars"];
  return <main style={{ minHeight: "100svh", background: "#000", color: "#f5f5f5", fontFamily: "var(--mono)", paddingBottom: 48 }}>
    <header style={{ borderBottom: "1px solid #262626", padding: "18px max(20px, calc((100vw - 1120px)/2))", display: "flex", justifyContent: "space-between", alignItems: "center" }}><a href="/" style={{ ...linkStyle, color: "#fff", fontWeight: 700, letterSpacing: "-.06em", fontSize: 20 }}>OCodeJS.</a><span style={{ color: "#777", fontSize: 10, letterSpacing: ".14em" }}>PUBLIC PROFILE</span></header>
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "22px 20px" }}>
      <nav aria-label="Profile sections" style={{ display: "flex", gap: 22, overflowX: "auto", borderBottom: "1px solid #262626", marginBottom: 26, whiteSpace: "nowrap" }}>{tabs.map((tab, i) => <a key={tab} href={i === 0 ? `/u/${profile.username}` : `/u/${profile.username}#${tab.toLowerCase()}`} style={{ padding: "12px 0", color: i === 0 ? "#fff" : "#888", borderBottom: i === 0 ? "2px solid #fff" : "2px solid transparent", textDecoration: "none", fontSize: 12 }}>{tab}</a>)}</nav>
      <div className="profile-layout" style={{ display: "grid", gridTemplateColumns: "minmax(210px, 260px) minmax(0, 1fr)", gap: 26 }}>
        <aside><div style={{ width: "100%", aspectRatio: "1", border: "1px solid #303030", background: "#111", display: "grid", placeItems: "center", overflow: "hidden" }}>{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/> : <span style={{ fontSize: 56, color: "#aaa" }}>{displayName.slice(0,1).toUpperCase()}</span>}</div><h1 style={{ fontSize: 23, margin: "16px 0 2px", letterSpacing: "-.05em" }}>{displayName}</h1><div style={{ color: "#888", fontSize: 13 }}>@{profile.username}</div>{profile.bio && <p style={{ color: "#c2c2c2", fontSize: 12, lineHeight: 1.8, margin: "16px 0" }}>{profile.bio}</p>}<div style={{ color: "#aaa", fontSize: 11, lineHeight: 2.2, marginTop: 12 }}><div><b>{profile._count.followers}</b> followers · <b>{profile._count.following}</b> following</div>{profile.location && <div>⌖ {profile.location}</div>}{profile.timezone && <div>◷ {profile.timezone}</div>}{profile.websiteUrl && <div>↗ <a href={profile.websiteUrl} rel="nofollow noopener noreferrer" target="_blank" style={linkStyle}>{profile.websiteUrl}</a></div>}{profile.githubUsername && <div>⌘ <a href={`https://github.com/${profile.githubUsername}`} rel="nofollow noopener noreferrer" target="_blank" style={linkStyle}>github.com/{profile.githubUsername}</a></div>}</div><div style={{ display: "grid", gap: 8, marginTop: 18 }}>{!isOwnProfile && <FollowButton username={profile.username} initialFollowing={initialFollowing} />}{isOwnProfile && <a href="/account/profile" style={{ ...linkStyle, border: "1px solid #444", padding: 10, textAlign: "center", fontSize: 11 }}>EDIT PROFILE</a>}{profile.links.map(link => <a key={link.id} href={link.url} target="_blank" rel="nofollow noopener noreferrer" style={linkStyle}>{link.label}</a>)}</div></aside>
        <section style={{ minWidth: 0 }}>
          <section style={panel}><h2 style={{ fontSize: 13, margin: "0 0 14px" }}>README.md</h2>{profile.readme ? <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", font: "inherit", fontSize: 12, lineHeight: 1.9, color: "#c8c8c8", margin: 0 }}>{profile.readme}</pre> : <p style={{ color: "#777", fontSize: 12 }}>Chưa có profile README. Người dùng có thể thêm nội dung trong phần Edit profile.</p>}</section>
          <section id="repositories" style={panel}><h2 style={{ fontSize: 13, margin: "0 0 14px" }}>📌 GitHub repositories</h2>{Array.isArray(githubRepos) && githubRepos.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>{githubRepos.map((repo: any) => <article key={repo.id} style={{ border: "1px solid #292929", padding: 13 }}><a href={repo.html_url} target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, fontSize: 12, fontWeight: 700 }}>{repo.name}</a><p style={{ color: "#888", fontSize: 11, lineHeight: 1.6, minHeight: 30 }}>{repo.description || "No description provided."}</p><small style={{ color: "#777", display: "block", marginBottom: 9 }}>{repo.language || "—"}　☆ {repo.stargazers_count}　⑂ {repo.forks_count}</small><StarButton resourceId={repo.full_name} /></article>)}</div> : <p style={{ color: "#777", fontSize: 12 }}>{profile.githubUsername ? "GitHub data is unavailable at the moment." : "Connect a public GitHub username to display repositories."}</p>}</section>
          <section id="projects" style={panel}><h2 style={{ fontSize: 13, margin: "0 0 10px" }}>Projects</h2><p style={{ color: "#777", fontSize: 12 }}>Project publishing will appear here when the OCode.js Projects catalog is connected.</p></section>
          <section id="packages" style={panel}><h2 style={{ fontSize: 13, margin: "0 0 10px" }}>Packages</h2><p style={{ color: "#777", fontSize: 12 }}>Published packages will appear here when package registry integration is enabled.</p></section>
          <section id="stars" style={panel}><h2 style={{ fontSize: 13, margin: "0 0 12px" }}>Stars · {profile._count.stars}</h2>{profile.stars.length ? profile.stars.map(star => <div key={star.id} style={{ padding: "9px 0", borderTop: "1px solid #202020", fontSize: 12, color: "#c5c5c5" }}>{star.resourceType} · {star.resourceId}</div>) : <p style={{ color: "#777", fontSize: 12 }}>Chưa có mục nào được đánh dấu sao.</p>}</section>
          {profile.showActivity && <section style={panel}><h2 style={{ fontSize: 13, margin: "0 0 14px" }}>Recent activity</h2>{profile.activities.map(event => <div key={event.id} style={{ borderLeft: "1px solid #444", padding: "2px 0 12px 13px", marginBottom: 8, color: "#c6c6c6", fontSize: 11 }}>{event.summary}<small style={{ display: "block", color: "#777", marginTop: 5 }}>{event.createdAt.toLocaleDateString("en-US")}</small></div>)}{githubEvents.map((event: any, index: number) => <div key={event.id || `gh-${index}`} style={{ borderLeft: "1px solid #31528b", padding: "2px 0 12px 13px", marginBottom: 8, color: "#c6c6c6", fontSize: 11 }}>{String(event.type || "GitHub event").replace(/Event$/, "")} · {event.repo?.name || "GitHub"}<small style={{ display: "block", color: "#777", marginTop: 5 }}>{event.created_at ? new Date(event.created_at).toLocaleDateString("en-US") : "GitHub public activity"}</small></div>)}{!profile.activities.length && !githubEvents.length && <p style={{ color: "#777", fontSize: 12 }}>Chưa có hoạt động công khai.</p>}</section>}
        </section>
      </div>
    </div>
    <style>{`@media(max-width:700px){.profile-layout{grid-template-columns:1fr!important}}`}</style>
  </main>;
}
