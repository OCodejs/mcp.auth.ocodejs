import { createHash } from "node:crypto";

export type OidcProviderEnvironment = Record<string, string | undefined>;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function validateOidcIssuer(
  rawIssuer: string | undefined,
  nodeEnv: string | undefined = process.env.NODE_ENV
): string | null {
  if (!rawIssuer) return null;
  if (rawIssuer !== rawIssuer.trim()) {
    throw new Error("AUTH_OIDC_ISSUER must not contain surrounding whitespace.");
  }

  let issuer: URL;
  try {
    issuer = new URL(rawIssuer);
  } catch {
    throw new Error("AUTH_OIDC_ISSUER must be an absolute HTTPS URL.");
  }

  const localDevelopmentHttp =
    nodeEnv === "development" &&
    issuer.protocol === "http:" &&
    LOCAL_HOSTS.has(issuer.hostname);

  if (issuer.protocol !== "https:" && !localDevelopmentHttp) {
    throw new Error("AUTH_OIDC_ISSUER must use HTTPS (HTTP is allowed only for local development).");
  }
  if (issuer.username || issuer.password || issuer.search || issuer.hash) {
    throw new Error("AUTH_OIDC_ISSUER must not contain credentials, query parameters, or fragments.");
  }

  return rawIssuer;
}

export function createOptionalOidcProvider(
  env: OidcProviderEnvironment = process.env
) {
  const issuerValue = env.AUTH_OIDC_ISSUER;
  const clientId = env.AUTH_OIDC_ID;
  const clientSecret = env.AUTH_OIDC_SECRET;
  const configured = [issuerValue, clientId, clientSecret].some(Boolean);

  if (!configured) return [];
  if (!issuerValue || !clientId || !clientSecret) {
    throw new Error("Configure AUTH_OIDC_ISSUER, AUTH_OIDC_ID, and AUTH_OIDC_SECRET together.");
  }

  const issuer = validateOidcIssuer(issuerValue);
  if (!issuer) return [];

  // Auth.js persists the provider id in Account.provider. Namespace it by issuer
  // so two issuers that emit the same subject can never share an account key.
  const issuerKey = createHash("sha256").update(issuer).digest("hex").slice(0, 16);

  return [{
    id: `ocodejs-oidc-${issuerKey}`,
    name: "Enterprise OIDC",
    type: "oidc" as const,
    issuer,
    clientId,
    clientSecret,
    checks: ["pkce", "state", "nonce"] as ("pkce" | "state" | "nonce")[]
  }];
}
