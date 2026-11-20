# OCodeJS Auth Core — Security Audit

Date: 2026-11-20
Repository baseline: main
Scope: read-only source review; no credentials, live users, or production systems accessed.

## Executive summary

The current Auth Core is a useful baseline, not yet production-ready as a public multi-tenant identity provider. Existing Google/GitHub OAuth and email/password flows should be preserved while the controls below are implemented and tested.

## Verified implementation

- Auth.js v5 with Google and GitHub providers enabled only when both provider environment variables exist.
- Credentials login validates email/password with Zod and compares bcryptjs hashes.
- Registration enforces a 12–128 character password and hashes with bcryptjs cost 12.
- User/profile registration is transactional.
- Session strategy is JWT; the session exposes the internal user ID.
- Prisma Account uses a compound primary key on provider + providerAccountId.
- Health endpoint performs a read-only SELECT 1 and disables caching.
- BYOK Token Vault is server-mediated and separate from identity provider credentials according to repository documentation.

## Findings and required controls

### Critical / release blockers

1. Registration and credential login have no verified distributed rate limiter. Add shared-store limits with atomic increments, bounded TTL, IP and normalized-identifier dimensions, and fail-closed behavior when the limiter is required but unavailable.
2. Email/password accounts are not verified. Add one-time, hashed, expiring verification tokens; prevent replay; do not expose account existence.
3. Password recovery is absent. Add one-time hashed reset tokens, short expiry, generic responses, and invalidate active sessions after successful reset according to policy.
4. OAuth/OIDC Authorization Server functionality is not present. Auth.js sign-in is an upstream relying-party/client role, not an OIDC Provider for third-party websites.

### High priority

5. Audit Auth.js adapter account-token persistence. Provider access/refresh/id tokens must not be retained unless required; if retained, encrypt at rest, restrict reads, redact logs, and define revocation/deletion.
6. Add explicit authenticated account-linking routes. Never auto-merge users solely by matching email; require proof of control of both identities and enforce unique provider-subject ownership.
7. Add end-to-end tests for state, nonce, PKCE, redirect allowlists, issuer/audience/signature/expiry, malformed claims, and provider outages.
8. Add security headers, cookie assertions, CSRF/origin checks, and tests for credential login and all state-changing endpoints.
9. Confirm trustHost is safe for each deployment platform and that trusted proxy/host configuration cannot be influenced by arbitrary inbound headers.
10. Review session lifetime, rotation, revocation, and account deletion semantics; keep JWT/session claims minimal and never include BYOK values or provider secrets.

### Medium priority

11. Add abuse monitoring, audit event retention, privacy-aware IP handling, pagination, and alert thresholds.
12. Add dependency audit and lockfile reproducibility to CI; review beta Auth.js and floating latest dependencies before production promotion.

## Source observations

- auth.ts: Google, GitHub, Credentials; JWT sessions; no explicit custom linking policy visible in this file.
- app/api/register/route.ts: validation and transactional creation exist; comment explicitly says a managed rate limiter is still required.
- prisma/schema.prisma: User.emailVerified exists; VerificationToken exists; no explicit password-reset purpose/type model; Account stores OAuth token fields.
- app/api/health/route.ts: readiness only; not an end-to-end authentication proof.
- .github/workflows/ci.yml: tests, Prisma generation/validation, typecheck and build; no dependency audit or OAuth protocol test suite shown in inspected workflow.
- lib/prisma.ts: bounded single-connection PostgreSQL pool and pooled URL preference.

## Release gate

Do not enable public Production use until rate limiting, email verification/recovery, account-linking policy, provider-token retention review, security tests, and Preview end-to-end checks pass. No production secrets or callback hostnames should be guessed.

## Verification limits

This audit is based on source files fetched from the repository. No local build, test suite, live OAuth callback, database mutation, or deployment was executed as part of this audit.