import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ username: string }> }) {
  const { username } = await context.params;
  const profile = await prisma.profile.findFirst({
    where: { username: username.toLowerCase(), isPublic: true },
    select: {
      username: true, displayName: true, bio: true, avatarUrl: true, websiteUrl: true,
      location: true, timezone: true, statusText: true, readme: true, githubUsername: true,
      createdAt: true,
      _count: { select: { followers: true, following: true, stars: true } },
      links: { orderBy: { sortOrder: "asc" }, select: { kind: true, label: true, url: true } }
    }
  });
  if (!profile) return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ profile, stats: {
    followers: profile._count.followers,
    following: profile._count.following,
    stars: profile._count.stars
  } }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
