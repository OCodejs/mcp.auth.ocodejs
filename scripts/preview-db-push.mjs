import { execFileSync } from "node:child_process";

const isPreview = process.env.VERCEL_ENV === "preview";
const enabled = process.env.AUTH_PREVIEW_DB_PUSH === "true";

if (!isPreview || !enabled) {
  console.log("Skipping Preview-only Prisma schema setup.");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to initialize the Preview schema.");
}

console.log("Applying Prisma schema to the isolated auth_preview namespace.");
execFileSync("npx", ["prisma", "db", "push", "--schema", "prisma/schema.prisma"], {
  stdio: "inherit",
  env: process.env
});
