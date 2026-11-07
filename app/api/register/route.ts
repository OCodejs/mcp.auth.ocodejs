import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureProfileForUser } from "@/lib/profiles";

export const runtime = "nodejs";

const registrationSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128)
});

export async function POST(request: Request) {
  // Reject cross-origin JSON submissions. A managed rate limiter is still required before public production use.
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nhập tên, email hợp lệ và mật khẩu từ 12 ký tự trở lên." },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  try {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: "Không thể tạo tài khoản với email này." }, { status: 409 });
    }
    const passwordHash = await hash(parsed.data.password, 12);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: parsed.data.name, email, passwordHash }
      });
      await ensureProfileForUser(tx, user);
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Dịch vụ đăng ký tạm thời không khả dụng." }, { status: 503 });
  }
}