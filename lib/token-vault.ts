import "server-only";
import { createHmac, randomUUID } from "node:crypto";

type VaultUser = { id: string };
const b64 = (value: string) => Buffer.from(value, "utf8").toString("base64url");

function assertionFor(user: VaultUser) {
  const secret = process.env.TOKEN_VAULT_ASSERTION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Token Vault is not configured");
  const now = Math.floor(Date.now() / 1000);
  const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64(JSON.stringify({
    iss: "ocodejs-account", aud: "ocodejs-token-vault", sub: user.id,
    iat: now, exp: now + 60, jti: randomUUID()
  }));
  const unsigned = header + "." + payload;
  const signature = createHmac("sha256", secret).update(unsigned).digest("base64url");
  return unsigned + "." + signature;
}

export async function tokenVaultRequest<T>(
  user: VaultUser,
  path: string,
  init: { method?: "GET" | "POST" | "DELETE"; body?: unknown } = {}
): Promise<T> {
  const base = process.env.TOKEN_VAULT_URL;
  if (!base) throw new Error("Token Vault is not configured");
  const url = new URL(path, base.endsWith("/") ? base : base + "/");
  const response = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      Authorization: "Bearer " + assertionFor(user),
      ...(init.body === undefined ? {} : { "Content-Type": "application/json" })
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error("Token Vault request failed (" + response.status + ")");
  return await response.json() as T;
}

/** Server-only: resolves a user's credential for an upstream provider call. Never return this value from a Route Handler. */
export async function resolveTokenForServer(user: VaultUser, tokenId: string): Promise<string> {
  if (!/^[0-9a-f-]{36}$/i.test(tokenId)) throw new Error("Invalid credential ID");
  const result = await tokenVaultRequest<{ value: string }>(
    user, "/api/service/tokens/" + tokenId + "/resolve", { method: "POST" }
  );
  if (typeof result.value !== "string") throw new Error("Credential unavailable");
  return result.value;
}
