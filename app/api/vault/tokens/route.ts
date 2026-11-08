import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { tokenVaultRequest } from "@/lib/token-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  label: z.string().trim().min(1).max(100),
  provider: z.enum(["openai", "google", "anthropic", "custom"]),
  value: z.string().min(8).max(8192)
});

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" }
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);
  try {
    const result = await tokenVaultRequest<{ tokens: Array<{ id: string; label: string; provider: string; created_at: string }> }>(
      { id: session.user.id }, "/api/service/tokens"
    );
    return json({ tokens: result.tokens ?? [] });
  } catch {
    return json({ error: "Không thể tải danh sách API key. Kiểm tra cấu hình Token Vault." }, 503);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);
  let raw: unknown;
  try { raw = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return json({ error: "Thông tin API key không hợp lệ." }, 400);
  try {
    const result = await tokenVaultRequest<{ id: string }>(
      { id: session.user.id }, "/api/service/tokens", { method: "POST", body: parsed.data }
    );
    return json({ id: result.id, saved: true }, 201);
  } catch {
    return json({ error: "Không thể lưu API key vào Token Vault." }, 503);
  }
}
