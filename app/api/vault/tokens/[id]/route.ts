import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { tokenVaultRequest } from "@/lib/token-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid credential ID" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  try {
    await tokenVaultRequest<{ ok: boolean }>(
      { id: session.user.id }, "/api/service/tokens/" + id, { method: "DELETE" }
    );
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Không thể xóa API key." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
