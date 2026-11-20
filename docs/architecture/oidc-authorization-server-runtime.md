# OCodeJS Authorization Server — Runtime Architecture Decision

Status: Accepted for implementation planning; runtime implementation is gated.

## Context

The existing Next.js application is deployed through an OpenNext/Cloudflare Worker configuration. Auth.js currently acts as an OAuth/OIDC relying party (RP): it delegates sign-in to Google, GitHub, and optionally an enterprise OIDC issuer. That is not an authorization server for external applications.

OCodeJS needs a separate issuer that can authenticate OCodeJS users and issue authorization codes, ID tokens, and access tokens to registered relying-party applications.

## Decision

Use `oidc-provider` (Node.js) as the protocol engine, behind a dedicated Node.js runtime boundary. Do not implement OAuth/OIDC protocol primitives by hand and do not instantiate the provider per request with in-memory state.

The library implements OAuth 2.0 and OpenID Connect, including discovery, PKCE, token revocation, and introspection; features must be explicitly configured and tested. Its documented quick start uses a long-lived Node.js Provider and `provider.listen()`. The current Cloudflare Worker target is not assumed to provide that Node server lifecycle.

## Required deployment boundary

Before enabling an issuer hostname, select a supported Node.js hosting target with:
- long-lived or platform-supported Node request handling;
- durable shared storage for authorization codes, grants, sessions, refresh tokens, and replay state;
- stable issuer URL and HTTPS;
- persistent signing keys with rotation and backup;
- no reliance on process memory for protocol state.

No paid resource or Production deployment is authorized by this ADR. The initial implementation must remain disabled until a Preview-capable Node runtime and isolated database are verified.

## Identity and interaction boundary

- The OCodeJS application remains the identity source and owns account credentials.
- The authorization server redirects the browser to the existing OCodeJS login/consent UX; it must never collect passwords in a third-party client.
- Resolve the authenticated OCodeJS user from a server-validated session, not a client-supplied subject.
- Require explicit consent for scopes and client access.
- Client registrations are administrator-approved initially; no public dynamic registration.
- Redirect URIs use exact string matching; no wildcards or open redirects.
- Public clients require Authorization Code + PKCE S256.
- Do not enable implicit or resource-owner-password grants.
- Use short-lived one-time authorization codes, strict issuer/audience/nonce checks, asymmetric signing, JWKS rotation, refresh-token rotation, reuse detection, revocation, and logout semantics.
- Never include provider access tokens, BYOK credentials, or internal database fields in ID tokens or UserInfo.

## Data model

A dedicated, reviewed migration is required for OAuth clients, redirect URIs, grants, interactions/consents, authorization codes, refresh-token families, and audit events. Secrets and bearer tokens must be hashed or encrypted at rest as appropriate. The adapter must implement atomic consumption and replay detection.

Do not reuse the existing Auth.js Account table as an authorization-server token store.

## Acceptance gates

1. Runtime compatibility spike passes on the selected Node Preview target.
2. Durable adapter survives process restart and concurrent requests.
3. OIDC discovery, JWKS, authorization code + PKCE, token, UserInfo, revocation, and logout integration tests pass.
4. Negative tests cover redirect mismatch, state/nonce mismatch, code replay, refresh-token reuse, invalid audience, and expired tokens.
5. Independent protocol conformance/interoperability review before any production claim.

## Why implementation is not mounted in the current Worker

The protocol engine is a Node.js server library. The repository's configured deployment target is an OpenNext Cloudflare Worker. Mounting an unsupported server lifecycle or using an in-memory adapter would create a false sense of security and break multi-instance correctness. The first deliverable is therefore a gated Node-runtime design, not a fake OAuth endpoint.
