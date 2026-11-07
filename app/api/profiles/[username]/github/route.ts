import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ username: string }> }) {
  const { username } = await context.params;
  const profile = await prisma.profile.findFirst({ where: { username: username.toLowerCase(), isPublic: true }, select: { githubUsername: true } });
  if (!profile) return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });
  if (!profile.githubUsername) return NextResponse.json({ connected: false, github: null });
  const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "OCodeJS-Profile" };
  const [userResponse, reposResponse, eventsResponse] = await Promise.all([
    fetch(`https://api.github.com/users/${encodeURIComponent(profile.githubUsername)}`, { headers, signal: AbortSignal.timeout(7000), cache: "no-store" }),
    fetch(`https://api.github.com/users/${encodeURIComponent(profile.githubUsername)}/repos?sort=updated&per_page=6&type=owner`, { headers, signal: AbortSignal.timeout(7000), cache: "no-store" }),
    fetch(`https://api.github.com/users/${encodeURIComponent(profile.githubUsername)}/events/public?per_page=10`, { headers, signal: AbortSignal.timeout(7000), cache: "no-store" })
  ]);
  if (!userResponse.ok) return NextResponse.json({ connected: true, available: false, error: userResponse.status === 404 ? "GITHUB_USER_NOT_FOUND" : "GITHUB_UNAVAILABLE" }, { status: userResponse.status === 404 ? 404 : 502 });
  const [user, repos, events] = await Promise.all([userResponse.json(), reposResponse.ok ? reposResponse.json() : [], eventsResponse.ok ? eventsResponse.json() : []]);
  return NextResponse.json({ connected: true, github: {
    login: user.login, name: user.name, avatarUrl: user.avatar_url, bio: user.bio,
    htmlUrl: user.html_url, publicRepos: user.public_repos, followers: user.followers,
    following: user.following, blog: user.blog, location: user.location,
    repositories: Array.isArray(repos) ? repos.map((repo: any) => ({ name: repo.name, fullName: repo.full_name, description: repo.description, url: repo.html_url, language: repo.language, stars: repo.stargazers_count, forks: repo.forks_count, updatedAt: repo.updated_at })) : [],
    events: Array.isArray(events) ? events.map((event: any) => ({ type: event.type, repo: event.repo?.name, createdAt: event.created_at })) : []
  } }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
