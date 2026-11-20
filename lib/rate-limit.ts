import { createHmac } from "node:crypto";

type RawQueryClient = {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
};

export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const DEFAULT_CLIENT_IP_HEADER = "cf-connecting-ip";

function digestBucket(secret: string, scope: string, identifier: string): string {
  return createHmac("sha256", secret)
    .update(`${scope}: ${identifier.trim().toLowerCase()}`)
    .digest("hex");
}

export function getTrustedClientIp(request: Request): string | null {
  const configuredHeader = process.env.AUTH_CLIENT_IP_HEADER;
  if (!configuredHeader) return null;
  if (configuredHeader !== DEFAULT_CLIENT_IP_HEADER) {
    throw new Error("AUTH_CLIENT_IP_HEADER must be cf-connecting-ip; configure only a trusted edge header.");
  }
  const value = request.headers.get(configuredHeader)?.trim();
  if (!value || value.length > 64 || /[,\s]/.test(value)) return null;
  return value;
}

export async function consumeRateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
  options: {
    client?: RawQueryClient;
    secret?: string;
    now?: Date;
  } = {}
): Promise<RateLimitDecision> {
  if (!identifier || !Number.isInteger(limit) || limit < 1 ||
      !Number.isInteger(windowSeconds) || windowSeconds < 1) {
    throw new Error("Invalid rate-limit policy or identifier.");
  }

  const secret = options.secret ?? process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters for rate-limit key derivation.");
  }

  const client = options.client ?? (await import("@/lib/prisma")).prisma;
  const now = options.now ?? new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);
  const key = digestBucket(secret, scope, identifier);

  const rows = await client.$queryRaw<Array<{ allowed: boolean }>>`
    INSERT INTO "RateLimitBucket" ("key", "count", "windowStartedAt", "expiresAt")
    VALUES (${key}, 1, ${now}, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."windowStartedAt" <= ${windowStart} THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "RateLimitBucket"."windowStartedAt" <= ${windowStart} THEN ${now}
        ELSE "RateLimitBucket"."windowStartedAt"
      END,
      "expiresAt" = ${expiresAt}
    WHERE "RateLimitBucket"."windowStartedAt" <= ${windowStart}
       OR "RateLimitBucket"."count" < ${limit}
    RETURNING ("count" <= ${limit}) AS allowed
  `;

  return {
    allowed: rows.length > 0 && rows[0].allowed,
    retryAfterSeconds: windowSeconds
  };
}

export async function enforceAuthRateLimit(
  request: Request,
  scope: "register" | "login",
  identifier: string
): Promise<RateLimitDecision> {
  const policy = scope === "register"
    ? { limit: 5, windowSeconds: 15 * 60 }
    : { limit: 10, windowSeconds: 15 * 60 };

  const buckets = [
    consumeRateLimit(`${scope}:identity`, identifier, policy.limit, policy.windowSeconds)
  ];

  const clientIp = getTrustedClientIp(request);
  if (clientIp) {
    buckets.push(
      consumeRateLimit(`${scope}:ip`, clientIp, scope === "register" ? 20 : 60, policy.windowSeconds)
    );
  }

  const decisions = await Promise.all(buckets);
  const denied = decisions.find((decision) => !decision.allowed);
  return denied ?? { allowed: true, retryAfterSeconds: policy.windowSeconds };
}
