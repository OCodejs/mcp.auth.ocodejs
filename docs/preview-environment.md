# Account Auth — isolated Preview environment

## Purpose

This branch is intended to trigger a Cloudflare Workers Preview build for the Auth.js application. The existing `mcp-server-auth` production deployment command remains disabled; non-production branches use the Workers Builds Preview command.

## Preview isolation

- Preview URLs are protected by the existing Cloudflare Access policy named `Cloudflare Workers Preview URLs`, which allows Cloudflare account members.
- Workers Previews do not inherit production settings. Preview-specific variables, secrets and resource bindings must be configured independently.
- The production D1 database `ocodejs-auth-db` is not a PostgreSQL replacement and must not be attached to this Prisma application.
- No production database, OAuth credential or account data is copied into Preview.

## Build evidence — current main Preview

- Branch: `main` (manual Workers Builds Preview; not Production).
- Build ID: `2ff5e2e7-6cc2-4bd9-8170-e3362945c5a6`.
- Build outcome: **success** on 2026-11-07.
- Build command: `npm run build:cloudflare`.
- Verified build stages: Prisma Client generation, Next.js compilation, lint/type checks, static page generation, OpenNext bundle generation, and `npx wrangler preview`.
- Preview URL: https://main-mcp-server-auth.huynhthuongg2505-f9b.workers.dev
- Unique deployment URL: https://a12e8070-mcp-server-auth.huynhthuongg2505-f9b.workers.dev
- The Preview URL is covered by the existing `Cloudflare Workers Preview URLs` Access policy. HTTP route verification through the connected runner is still blocked by outbound-host restrictions; no claim is made that `/api/health` returned a successful response.

## Initial validation gate

The Preview build verifies application compilation and bundle deployment only. `GET /api/health` is expected to report `503 not_configured` until a dedicated Preview PostgreSQL database, `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, GitHub OAuth credentials and Google OAuth credentials are configured in the Preview environment. No database or OAuth secrets are configured yet.

Do not enable registration, login or OAuth controls as production-ready until the health endpoint reports ready and registration, password validation, provider callbacks, session persistence and logout pass end-to-end tests.

## Production safety

- Production build command is intentionally set to a no-op.
- This Preview branch must not change production Worker routes, production secrets, DNS, or database state.
