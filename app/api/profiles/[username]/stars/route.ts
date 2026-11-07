import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ username: string }> }) {
  const { username } = await context.params;
  const profile = await prisma.profile.findFirst({ where: { username: username.toLowerCase(), isPublic: true }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });
  const stars = await prisma.profileStar.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "desc" }, take: 100, select: { resourceType: true, resourceId: true, createdAt: true } });
  return NextResponse.json({ stars }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
