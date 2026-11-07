# Velclaw Identity Auth

Dark, responsive authentication foundation for the Velclaw ecosystem.

## Included

- Google OAuth and GitHub OAuth using Auth.js.
- Email/password registration and login, with a protected account page and sign-out.
- Password hashing with bcrypt (12 rounds); passwords are never stored in plaintext.
- Prisma/PostgreSQL persistence for users, provider accounts, and sessions.
- Environment-variable configuration; no real credentials belong in Git.
- Separate feature branch so the current production deployment is not overwritten.

## Required environment variables

See [`.env.example`](./.env.example). Configure values in local environment or Vercel project settings; do not commit secrets.

- `DATABASE_URL`: PostgreSQL URL.
- `AUTH_SECRET`: cryptographically random secret.
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`: Google OAuth app credentials.
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`: GitHub OAuth app credentials.
- `AUTH_URL`: canonical application URL in production.

OAuth callback URLs are `https://YOUR-DOMAIN/api/auth/callback/google` and `https://YOUR-DOMAIN/api/auth/callback/github`.

## Local setup

1. Install dependencies with `npm install`.
2. Set environment variables in an untracked `.env` file.
3. Run `npx prisma generate`.
4. Review the database target and backup policy, then apply the Prisma schema to the intended database.
5. Run `npm run dev`.

## Readiness endpoint

- `GET /api/health` returns a minimal, non-cacheable readiness response.
- It requires the Preview/Production runtime to provide `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, and both Google/GitHub OAuth client credentials.
- It runs a read-only `SELECT 1` against PostgreSQL before reporting `ready`.
- Missing configuration returns `503 not_configured`; database connectivity failure returns `503 unavailable`.
- The response never reveals which secret is missing, database errors, connection strings, or provider credentials.
- A ready response verifies configuration and database connectivity only; it does not replace end-to-end registration, OAuth callback, session, and logout tests.

## Deployment gate

This branch is not a production release. Before connecting it to the existing Vercel project, configure a dedicated preview database and OAuth callback URLs, run a Preview deployment, and verify registration, duplicate-email handling, invalid-password handling, OAuth callbacks, session persistence, and sign-out. Do not run schema changes against a production database without explicit review and backup.

## Important remaining hardening

Before public production use, add a managed rate limiter for registration/login, email verification and password reset, automated tests, and end-to-end verification. The registration endpoint rejects mismatched Origin headers, but this is not a substitute for rate limiting. OAuth credentials and database connectivity must be configured in Vercel before those flows can work end-to-end.
