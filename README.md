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

- `DATABASE_URL`: dedicated PostgreSQL connection string (pooled Neon URL recommended for serverless runtime).
- `AUTH_SECRET`: cryptographically random Auth.js secret.
- `AUTH_URL`: canonical application URL.
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`.

OAuth callback URLs:

- `https://YOUR-DOMAIN/api/auth/callback/google`
- `https://YOUR-DOMAIN/api/auth/callback/github`

## Local development

1. Install dependencies: `npm install`.
2. Configure an untracked `.env` with a dedicated development database and auth credentials.
3. Generate Prisma Client: `npx prisma generate`.
4. Apply reviewed migrations to the development database: `npx prisma migrate deploy`.
5. Start the app: `npm run dev`.

Do not use `prisma db push` against a shared or production database.

## API overview

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/register` | POST | Register account and create profile transactionally |
| `/api/auth/[...nextauth]` | GET, POST | Auth.js sign-in, callbacks, and session |
| `/api/health` | GET | Configuration and PostgreSQL readiness |
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

This repository is linked to Vercel. Work on this branch is Preview-only. Before enabling end-to-end sign-up:

1. Provision a dedicated OCode.js Preview PostgreSQL database. Do not reuse any Velclaw database or another application's database.
2. Add the database URL and OAuth settings to Vercel Preview only, scoped to this branch where supported.
3. Apply committed Prisma migrations to that Preview database.
4. Verify health, email registration, duplicate-email handling, invalid credentials, Google/GitHub callbacks, session persistence, profile creation/editing, follow/unfollow, stars, activity, and logout.
5. Confirm the deployment target is Preview, not Production.

Do not merge this branch or deploy Production without explicit authorization.

## Security follow-up before public production use

- Add a managed rate limiter to registration and credential login.
- Add email verification and password reset.
- Add end-to-end OAuth/session tests.
- Review dependency audit findings and update vulnerable packages in a separate tested change.
- Add abuse controls and pagination/retention policies for public activity.
