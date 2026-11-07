import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ username: string }> }) {
  const { username } = await context.params;
  const profile = await prisma.profile.findFirst({ where: { username: username.toLowerCase(), isPublic: true }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });
  const url = new URL(request.url);
  const take = Math.min(Math.max(Number(url.searchParams.get("limit")) || 30, 1), 100);
  const cursor = url.searchParams.get("cursor");
  const rows = await prisma.profileFollow.findMany({ where: { followerId: profile.id, followed: { isPublic: true } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: take + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true, createdAt: true, followed: { select: { username: true, displayName: true, avatarUrl: true, bio: true } } } });
  const hasMore = rows.length > take; const items = hasMore ? rows.slice(0, take) : rows;
  return NextResponse.json({ following: items, nextCursor: hasMore ? items.at(-1)?.id : null, hasMore }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
