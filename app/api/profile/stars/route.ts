import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureProfileForUser } from "@/lib/profiles";
import { hasSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
const schema = z.object({ resourceType: z.enum(["repository", "project", "package", "github_repository"]), resourceId: z.string().trim().min(1).max(255) }).strict();

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const profile = await ensureProfileForUser(prisma, session.user);
  const stars = await prisma.profileStar.findMany({ where: { profileId: profile.id }, select: { resourceType: true, resourceId: true }, orderBy: { createdAt: "desc" }, take: 500 });
  return NextResponse.json({ stars }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "ORIGIN_NOT_ALLOWED" }, { status: 403 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_STAR" }, { status: 400 });
  if (parsed.data.resourceType === "github_repository" && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(parsed.data.resourceId)) return NextResponse.json({ error: "INVALID_RESOURCE_ID" }, { status: 400 });
  const profile = await ensureProfileForUser(prisma, session.user);
  try {
    await prisma.$transaction([
      prisma.profileStar.create({ data: { profileId: profile.id, ...parsed.data } }),
      prisma.profileActivity.create({ data: { profileId: profile.id, eventType: "star", summary: `Starred ${parsed.data.resourceType} ${parsed.data.resourceId}`, metadata: parsed.data } })
    ]);
  } catch (error) {
    if ((error as { code?: string })?.code !== "P2002") throw error;
  }
  return NextResponse.json({ starred: true });
}

export async function DELETE(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "ORIGIN_NOT_ALLOWED" }, { status: 403 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_STAR" }, { status: 400 });
  const profile = await ensureProfileForUser(prisma, session.user);
  await prisma.profileStar.deleteMany({ where: { profileId: profile.id, ...parsed.data } });
  return NextResponse.json({ starred: false });
}
