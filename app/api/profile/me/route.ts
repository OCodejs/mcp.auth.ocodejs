import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasSameOrigin } from "@/lib/request-security";
import { ensureProfileForUser } from "@/lib/profiles";

export const runtime = "nodejs";
const schema = z.object({
  displayName: z.string().trim().max(80).nullable().optional(),
  bio: z.string().trim().max(280).nullable().optional(),
  avatarUrl: z.string().url().max(2048).nullable().optional(),
  websiteUrl: z.string().url().max(2048).nullable().optional(),
  location: z.string().trim().max(120).nullable().optional(),
  timezone: z.string().trim().max(80).nullable().optional(),
  statusText: z.string().trim().max(80).nullable().optional(),
  readme: z.string().max(20000).nullable().optional(),
  isPublic: z.boolean().optional(),
  showActivity: z.boolean().optional()
}).strict();

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const profile = await ensureProfileForUser(prisma, session.user);
  return NextResponse.json({ profile }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "ORIGIN_NOT_ALLOWED" }, { status: 403 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_PROFILE", details: parsed.error.flatten() }, { status: 400 });
  for (const url of [parsed.data.avatarUrl, parsed.data.websiteUrl]) {
    if (url && !["https:", "http:"].includes(new URL(url).protocol)) return NextResponse.json({ error: "INVALID_URL" }, { status: 400 });
  }
  const current = await ensureProfileForUser(prisma, session.user);
  const profile = await prisma.profile.update({ where: { id: current.id }, data: parsed.data });
  return NextResponse.json({ profile }, { headers: { "Cache-Control": "no-store" } });
}
