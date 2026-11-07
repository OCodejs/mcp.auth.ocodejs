import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasSameOrigin } from "@/lib/request-security";
import { ensureProfileForUser } from "@/lib/profiles";

export const runtime = "nodejs";

async function resolveProfiles(username: string) {
  const session = await auth();
  if (!session?.user?.id) return { response: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }) };
  const [actor, target] = await Promise.all([
    ensureProfileForUser(prisma, session.user),
    prisma.profile.findFirst({ where: { username: username.toLowerCase(), isPublic: true } })
  ]);
  if (!target) return { response: NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 }) };
  if (actor.id === target.id) return { response: NextResponse.json({ error: "CANNOT_FOLLOW_SELF" }, { status: 400 }) };
  return { actor, target };
}

export async function POST(_request: Request, context: { params: Promise<{ username: string }> }) {
  if (!hasSameOrigin(_request)) return NextResponse.json({ error: "ORIGIN_NOT_ALLOWED" }, { status: 403 });
  const { username } = await context.params;
  const resolved = await resolveProfiles(username);
  if ("response" in resolved) return resolved.response;
  try {
    await prisma.$transaction([
      prisma.profileFollow.create({ data: { followerId: resolved.actor.id, followedId: resolved.target.id } }),
      prisma.profileActivity.create({ data: { profileId: resolved.target.id, eventType: "follow", summary: `@${resolved.actor.username} started following this profile`, metadata: { actorUsername: resolved.actor.username } } })
    ]);
  } catch (error) {
    if ((error as { code?: string })?.code !== "P2002") throw error;
  }
  return NextResponse.json({ following: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ username: string }> }) {
  if (!hasSameOrigin(_request)) return NextResponse.json({ error: "ORIGIN_NOT_ALLOWED" }, { status: 403 });
  const { username } = await context.params;
  const resolved = await resolveProfiles(username);
  if ("response" in resolved) return resolved.response;
  await prisma.profileFollow.deleteMany({ where: { followerId: resolved.actor.id, followedId: resolved.target.id } });
  return NextResponse.json({ following: false });
}
