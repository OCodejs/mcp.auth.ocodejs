#!/usr/bin/env bash
set -Eeuo pipefail

# One-shot local CI. No GitHub Actions, no deployment, no database writes.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() { printf '\n[FAIL] %s\n' "$*" >&2; exit 1; }
step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

command -v node >/dev/null 2>&1 || fail "Node.js is not installed."
command -v npm >/dev/null 2>&1 || fail "npm is not installed."

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
[ "$NODE_MAJOR" -ge 22 ] || fail "Node.js 22+ required; found $(node --version)."

export CI=true
export AUTH_PREVIEW_DB_PUSH=false
export AUTH_SECRET="local-ci-placeholder-not-for-production"
export AUTH_URL="http://localhost:3000"
export AUTH_TRUST_HOST=true
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/ocodejs_auth_ci"
unset VERCEL_ENV || true
unset DATABASE_URL_POOLED || true
unset AUTH_PREVIEW_DB_TARGETS || true

step "Runtime"
node --version
npm --version
uname -srm

step "Synchronize package-lock.json with package.json"
npm install --package-lock-only --ignore-scripts --no-audit --no-fund

step "Install exactly from the regenerated lockfile"
npm ci --no-audit --no-fund

step "Unit tests"
npm test

step "Generate Prisma Client"
npx prisma generate

step "Validate Prisma schema"
npx prisma validate

step "TypeScript check"
npm run lint

step "Production-mode compile only (no deployment, no DB push)"
npm run build

step "Final repository diff"
git status --short
git diff --stat
printf '\n[PASS] Local validation completed. No deployment or database schema push was run.\n'
printf '[NOTE] package-lock.json may have changed; review it before committing.\n'
