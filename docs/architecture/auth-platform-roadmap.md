# OCodeJS Auth Platform — Architecture and 10-Phase Delivery Plan

## Product boundary

OCodeJS Auth has two distinct responsibilities:

1. Identity broker / relying party: authenticate OCodeJS users with upstream providers such as Google, GitHub, Discord, Microsoft, and generic enterprise OIDC.
2. Identity Provider (IdP): issue authorization codes, access tokens, ID tokens, and discovery metadata to external websites/apps that trust OCodeJS.

Auth.js currently supplies the first responsibility. The second requires a separately designed OAuth 2.0 Authorization Server / OpenID Provider. Do not describe the current Auth.js routes as an OIDC Provider.

## Target architecture

- Auth Core: immutable internal user identity, credentials, sessions, account lifecycle.
- Provider Adapter Registry: typed adapters for OAuth 2.0, OIDC, SAML, WebAuthn, and email delivery; protocol families must remain distinct.
- OIDC Authorization Server: authorization code flow with PKCE (S256), exact redirect URI matching, state/nonce, issuer/audience validation, JWKS signing-key rotation, discovery, revocation, and client registration/management.
- Authorization: RBAC first; ABAC as a separately evaluated policy layer.
- Security: distributed rate limits, CSRF/origin validation, audit events, secret redaction, token encryption and key rotation.
- SDKs: browser SDK uses public client IDs and PKCE; confidential client secrets remain server-side.

## Ten delivery phases

1. Auth Core security audit and hardening.
2. Provider Adapter registry and generic OIDC upstream support.
3. OCodeJS OAuth 2.0 Authorization Server / OIDC Provider.
4. Passwordless, email verification, and password recovery.
5. MFA, TOTP, WebAuthn and passkeys.
6. Session lifecycle, refresh-token rotation, revocation and device management.
7. Secure account linking and identity lifecycle.
8. RBAC, ABAC, organization and enterprise SSO (SAML only through maintained libraries).
9. Security operations: audit logs, abuse detection, rate limiting, privacy and retention.
10. Developer platform: REST API, SDKs, docs, sample integrations and Preview release.

## Provider adapter contract

Each adapter must declare protocol family, issuer/authorization/token/userinfo/JWKS endpoints as applicable, required scopes, stable subject claim, verified-email semantics, token refresh/revocation behavior, rate limits, callback requirements, and secret names. Use official Auth.js providers where supported; use a generic OIDC adapter only with explicit issuer allowlists and validated discovery metadata. Never treat SAML, WebAuthn, email delivery, and OAuth as interchangeable providers.

## OIDC server security requirements

- Authorization Code + PKCE S256; reject implicit and password grants.
- Exact redirect URI matching; no wildcard or open redirects.
- Bind state and nonce; enforce one-time authorization code use and short expiry.
- Validate client authentication, scopes, audience, issuer, nonce, and signing algorithm.
- Publish JWKS with key IDs and a planned rotation/overlap procedure.
- Store refresh tokens hashed or encrypted, rotate on use, detect reuse, and support revocation.
- Keep client secret server-only; browser/public clients must use PKCE.
- Add consent, client ownership, redirect allowlists, logout semantics and audit trail.
- Do not claim OIDC conformance until protocol and interoperability tests pass.

## Data and migration policy

Review Prisma schema and migrations before any database write. Additive migrations only; do not run schema push or migrations against Production. Preview database target and isolation must be verified first. Keep identity data separate from BYOK model credentials and from other products' databases.

## Environment variables (names only)

- Upstream provider credentials: AUTH_<PROVIDER>_ID, AUTH_<PROVIDER>_SECRET.
- OIDC issuer and signing: OIDC_ISSUER, OIDC_SIGNING_KEY_ID, private-key material only in platform secret storage.
- Email delivery: AUTH_EMAIL_FROM, provider-specific server-only API credential.
- Distributed rate limiter: provider-specific URL/token in Preview secret store only.
- Never add secret values to this repository or browser bundles.

## Delivery acceptance

Each phase requires source review, tests, dependency review, Preview deployment, verified callback hostnames, and a documented rollback. Production, DNS, merge, destructive database changes, and paid resources remain gated by explicit approval.