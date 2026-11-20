# OCode.js Authentication & Identity

Authentication and account identity service for the OCode.js ecosystem.

## Features

- Auth.js v5 with Google OAuth, GitHub OAuth, and email/password credentials.
- bcryptjs password hashing; plaintext passwords are never stored.
- Prisma + PostgreSQL persistence for users, provider accounts, sessions, and profiles.
- Automatic profile creation for email registration and OAuth sign-up.
- Public profiles at `/u/[username]`.
- Profile editing, GitHub username linking, follower/following graph, stars, and public activity.
- Readiness endpoint at `GET /api/health`.

## Runtime configuration

See [`.env.example`](./.env.example). Configure secrets only in the intended environment; never commit credentials.

- `DATABASE_URL`: direct Prisma Postgres connection string used by Prisma CLI/schema setup.
- `DATABASE_URL_POOLED`: pooled Prisma Postgres connection string used by the serverless runtime.
- `AUTH_PREVIEW_DB_PUSH`: defaults to `false`; set to `true` only on an approved Vercel Preview target to initialize the `auth_preview` schema. The build fails closed outside Preview.
- `AUTH_PREVIEW_DB_TARGETS`: comma-separated exact `host:port/database` allowlist for the direct and (if configured) pooled PostgreSQL endpoints. The build refuses schema writes unless every configured endpoint matches this list and both URLs identify the same database. Populate it only after verifying the database is dedicated to this Auth Preview.
- `AUTH_SECRET`: cryptographically random Auth.js secret.
- `AUTH_URL`: canonical application URL.
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`.

OAuth callback URLs:

- `https://YOUR-DOMAIN/api/auth/callback/google`
- `https://YOUR-DOMAIN/api/auth/callback/github`

## Secure BYOK / Token Vault

The account area includes a server-mediated API key manager at `/account/keys`.
Users can paste a provider key or import a supported `.env` / JSON file. File parsing
happens locally in the browser; only the selected key value is sent over HTTPS to the
server. The browser receives metadata only and cannot reveal a stored key.

The Next.js server signs a short-lived (60-second) HS256 assertion using
`TOKEN_VAULT_ASSERTION_SECRET`. The Cloudflare Token Vault verifies that assertion,
scopes every operation to the immutable Auth.js user ID, and stores the credential
using AES-GCM encryption in the dedicated Staging D1 database. The assertion secret
must exist only in server-side Preview environment variables and the Staging Worker
secret store. Do not add it to `NEXT_PUBLIC_*`, source control, client bundles, or logs.

Required Preview-only settings:
- `TOKEN_VAULT_URL`: the dedicated OCode.js Token Vault Staging Worker URL.
- `TOKEN_VAULT_ASSERTION_SECRET`: shared HMAC key, configured as a Vercel encrypted Preview variable and a Cloudflare Worker secret.

The service API never returns plaintext keys to the browser. The admin Vault view is
kept separate from user-owned credentials. Do not enable Production until security
tests, provider proxy integration, and secret-redaction checks pass.

## Local development

1. Install dependencies: `npm install`.
2. Configure an untracked `.env` with a dedicated development database and auth credentials.
3. Generate Prisma Client: `npx prisma generate`.
4. Apply reviewed migrations to the development database: `npx prisma migrate deploy`.
5. Start the app: `npm run dev`.

Do not use `prisma db push` against the shared/public or Production schema. The checked-in Prisma schema defaults to `public`; the Vercel Preview build creates a temporary schema variant that maps models to `auth_preview`. Production builds and the main branch generate the default `public` client.

## API overview

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/register` | POST | Register account and create profile transactionally |
| `/api/auth/[...nextauth]` | GET, POST | Auth.js sign-in, callbacks, and session |
| `/api/health` | GET | Configuration and PostgreSQL readiness |
| `/api/vault/tokens` | GET, POST | Manage per-user encrypted BYOK credentials |
| `/api/vault/tokens/[id]` | DELETE | Delete an owned credential |
| `/api/vault/chat` | POST | Server-side OpenAI, Anthropic, and Gemini gateway using an owned key |
| `/api/profile/me` | GET, PATCH | Read/update authenticated profile |
| `/api/profile/github` | PATCH | Set public GitHub username |
| `/api/profile/stars` | GET, POST, DELETE | Manage authenticated user's stars |
| `/api/profiles/[username]` | GET | Public profile and social counts |
| `/api/profiles/[username]/follow` | POST, DELETE | Follow/unfollow a public profile |
| `/api/profiles/[username]/followers` | GET | List followers |
| `/api/profiles/[username]/following` | GET | List followed profiles |
| `/api/profiles/[username]/stars` | GET | Public stars |
| `/api/profiles/[username]/activity` | GET | Public activity feed |
| `/api/profiles/[username]/github` | GET | Public GitHub profile/repository summary |

## Health semantics

- `200 ready`: required environment variables exist and a read-only PostgreSQL `SELECT 1` succeeds.
- `503 not_configured`: required settings are absent.
- `503 unavailable`: settings exist but database connectivity failed.

Health readiness does not prove OAuth callbacks or end-to-end registration work. Those require Preview tests.

## Preview release gate

This repository is linked to Vercel. Work on this branch is Preview-only.

**Current Vercel configuration warning:** the connected project currently exposes encrypted `DATABASE_URL` and `DATABASE_URL_POOLED` variables across Development, Preview and Production targets; their values were not read. No separate Preview-only database URL override was verified. Therefore keep `AUTH_PREVIEW_DB_PUSH=false` until Preview-scoped database URLs point to an independently verified non-production Auth database and the direct/pooled endpoints are added to `AUTH_PREVIEW_DB_TARGETS`. The allowlist is a second guard, not proof that a database is physically isolated.

1. The project uses an Auth-only Prisma Postgres resource. Preview maps its generated Prisma Client and models to the isolated `auth_preview` schema; Production and `main` generate the default `public` schema client. This is logical schema isolation on the same Auth database instance, not a separate physical Preview database; no Velclaw or other application's database is used.
2. Keep integration-managed `DATABASE_URL` and `DATABASE_URL_POOLED`; keep `AUTH_PREVIEW_DB_PUSH=false` until the actual database resource is verified. If schema initialization is explicitly approved, set it only on Preview and populate `AUTH_PREVIEW_DB_TARGETS` with the exact direct/pooled `host:port/database` endpoints. The build checks every configured endpoint and requires both URLs to identify the same database.
3. The Preview build generates the `auth_preview` Prisma Client. It runs `prisma db push` only when `VERCEL_ENV=preview`, `AUTH_PREVIEW_DB_PUSH=true`, and every configured database endpoint matches the explicit allowlist. Any push flag outside Preview fails closed.
4. Verify health, email registration, duplicate-email handling, invalid credentials, Google/GitHub callbacks, session persistence, profile creation/editing, follow/unfollow, stars, activity, and logout.
5. Confirm the deployment target is Preview, not Production.

Do not merge this branch or deploy Production without explicit authorization.

## Security follow-up before public production use

- Add a managed rate limiter to registration and credential login.
- Add email verification and password reset.
- Add end-to-end OAuth/session tests.
- Review dependency audit findings and update vulnerable packages in a separate tested change.
- Add abuse controls and pagination/retention policies for public activity.
