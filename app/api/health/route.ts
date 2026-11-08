import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUIRED_AUTH_SETTINGS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_URL"
] as const;

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    }
  });
}

export async function GET() {
  const checkedAt = new Date().toISOString();
  const providers = {
    google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    github: Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET)
  };
  const configured = REQUIRED_AUTH_SETTINGS.every((key) => {
    const value = process.env[key];
    return typeof value === "string" && value.trim().length > 0;
  });

  if (!configured) {
    return response({
      service: "ocodejs-account-auth",
      state: "not_configured",
      ready: false,
      providers,
      checkedAt
    }, 503);
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    return response({
      service: "ocodejs-account-auth",
      state: "ready",
      ready: true,
      providers,
      checkedAt
    }, 200);
  } catch {
    return response({
      service: "ocodejs-account-auth",
      state: "unavailable",
      ready: false,
      checkedAt
    }, 503);
  }
}
