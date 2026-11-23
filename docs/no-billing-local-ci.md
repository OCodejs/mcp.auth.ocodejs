# No-billing local CI (one-shot)

This workflow runs validation directly on an existing machine. It does **not** use GitHub Actions, hosted runners, a deployment provider, or a database service.

## Requirements

- Existing machine with Node.js 22+, npm, Git, and enough free disk/RAM.
- Repository already cloned and checked out to the intended branch.
- Network access to the npm registry for dependency installation. Registry downloads do not require a paid GitHub Actions runner.
- No new VM, paid runner, hosted sandbox, or subscription is provisioned by this script.

## Run once

From the repository root:

```bash
bash scripts/ci-no-billing.sh
```

## What it does

1. Checks Node.js/npm.
2. Regenerates a candidate `package-lock.json` from `package.json`.
3. Runs `npm ci`.
4. Runs unit tests.
5. Generates and validates Prisma Client/schema.
6. Runs TypeScript checks.
7. Runs the Next.js build.

## Safety

- `AUTH_PREVIEW_DB_PUSH=false`.
- Clears Preview database allowlist variables and `VERCEL_ENV`.
- Uses a localhost placeholder DATABASE_URL only for Prisma validation.
- Does not run `prisma db push`, migrations, deploy commands, or Production operations.
- Does not commit or push changes.
- The lockfile may change; review `git diff -- package-lock.json` before committing.

## Important limitation

This is a one-shot local validation script, not a persistent GitHub Actions runner. To execute it on Velclaw, the script must be run on the existing Velclaw host. No remote host shell is assumed or provisioned here. Zero-cost operation cannot be guaranteed by this repository: use only a machine and network access already available to you, and stop if the host/provider reports a charge or quota limit.
