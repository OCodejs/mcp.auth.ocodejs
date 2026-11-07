# OCode.js Auth — Preview environment

## Purpose

This guide describes the isolated Vercel Preview environment for `OCodejs/mcp.auth.ocodejs`.

## Isolation requirements

- Use a dedicated PostgreSQL database for this OCode.js auth service.
- Never attach a Velclaw database or another OCode.js application's database.
- Store Preview credentials as Vercel Preview environment variables; scope branch-specific values to `fix/profile-username-types-ci` where supported.
- Do not change Production environment variables, domains, deployment targets, or database bindings.
- Do not place OAuth client secrets, Auth.js secrets, or database URLs in Git.

## Required Preview variables

- `DATABASE_URL`: dedicated Preview PostgreSQL connection URL.
- `AUTH_SECRET`: independent Preview secret.
- `AUTH_URL`: exact Vercel Preview URL.
- `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`.
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

Configure OAuth callback URLs for the exact Preview host:

- `https://PREVIEW-HOST/api/auth/callback/github`
- `https://PREVIEW-HOST/api/auth/callback/google`

## Database migration

Review `prisma/schema.prisma` and all committed SQL migrations first. Apply migrations only to the dedicated Preview database using `npx prisma migrate deploy`. Never run migrations against Production.

## Validation gate

1. Confirm the deployment has Vercel target `preview`.
2. Confirm `GET /api/health` returns `200` with `state: ready`.
3. Test email registration and verify a Profile row is created in the same transaction.
4. Test Google and GitHub OAuth callbacks and verify each new account receives one profile.
5. Test login, logout, session persistence, profile editing, GitHub profile linking, follow/unfollow, stars, and activity visibility.
6. Inspect Preview runtime logs for errors and confirm no secrets are logged.

A successful build alone is not a completed auth deployment. Keep the PR open and unmerged until the dedicated database and OAuth credentials are configured and end-to-end checks pass.

## Production safety

Production environment variables and the existing Production deployment must remain unchanged. No production migration, domain switch, or merge is authorized by this Preview work.
