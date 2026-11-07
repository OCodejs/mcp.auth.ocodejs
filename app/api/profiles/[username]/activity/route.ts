import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ username: string }> }) {
  const { username } = await context.params;
  const profile = await prisma.profile.findFirst({ where: { username: username.toLowerCase(), isPublic: true }, select: { id: true, showActivity: true } });
  if (!profile) return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });
  if (!profile.showActivity) return NextResponse.json({ activities: [] });
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const take = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 50);
  const activities = await prisma.profileActivity.findMany({
    where: { profileId: profile.id, isPublic: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, eventType: true, summary: true, resourceUrl: true, metadata: true, createdAt: true }
  });
  const hasMore = activities.length > take;
  const items = hasMore ? activities.slice(0, take) : activities;
  return NextResponse.json({ activities: items, nextCursor: hasMore ? items[items.length - 1]?.id : null, hasMore }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
}
