# Account Auth — isolated Preview environment

## Purpose

This branch is intended to trigger a Cloudflare Workers Preview build for the Auth.js application. The existing `mcp-server-auth` production deployment command remains disabled; non-production branches use the Workers Builds Preview command.

## Preview isolation

- Preview URLs are protected by the existing Cloudflare Access policy named `Cloudflare Workers Preview URLs`, which allows Cloudflare account members.
- Workers Previews do not inherit production settings. Preview-specific variables, secrets and resource bindings must be configured independently.
- The production D1 database `ocodejs-auth-db` is not a PostgreSQL replacement and must not be attached to this Prisma application.
- No production database, OAuth credential or account data is copied into Preview.

## Initial validation gate

The first Preview build is for application boot and route verification only. It is expected to report `503 not_configured` from `GET /api/health` until a dedicated Preview PostgreSQL database, `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, GitHub OAuth credentials and Google OAuth credentials are configured in the Preview environment.

Do not enable registration, login or OAuth controls as production-ready until the health endpoint reports ready and registration, password validation, provider callbacks, session persistence and logout pass end-to-end tests.

## Production safety

- Production build command is intentionally set to a no-op.
- This Preview branch must not change production Worker routes, production secrets, DNS, or database state.
