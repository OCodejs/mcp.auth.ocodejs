import { execFileSync } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import { createPreviewSchema } from "./prisma-schema.mjs";
import { assertPreviewDatabaseTarget } from "./preview-db-target.mjs";

const schemaPath = "prisma/schema.prisma";
const previewSchemaPath = "prisma/.schema.preview.prisma";
const isPreview = process.env.VERCEL_ENV === "preview";
const pushPreviewSchema = process.env.AUTH_PREVIEW_DB_PUSH === "true";

if (pushPreviewSchema && !isPreview) {
  throw new Error("AUTH_PREVIEW_DB_PUSH is permitted only when VERCEL_ENV=preview.");
}

function runPrisma(args) {
  execFileSync("npx", ["prisma", ...args], {
    stdio: "inherit",
    env: process.env
  });
}

if (!isPreview) {
  console.log("Generating Prisma Client for the default public schema.");
  runPrisma(["generate", "--schema", schemaPath]);
} else {
  const source = await readFile(schemaPath, "utf8");
  await writeFile(previewSchemaPath, createPreviewSchema(source), "utf8");

  try {
    console.log("Generating Prisma Client for the isolated auth_preview schema.");
    runPrisma(["generate", "--schema", previewSchemaPath]);

    if (pushPreviewSchema) {
      assertPreviewDatabaseTarget({
        vercelEnv: process.env.VERCEL_ENV,
        pushPreviewSchema,
        databaseUrl: process.env.DATABASE_URL,
        pooledDatabaseUrl: process.env.DATABASE_URL_POOLED,
        allowedTargets: process.env.AUTH_PREVIEW_DB_TARGETS
      });
      console.log("Applying Prisma schema to the explicitly allowlisted auth_preview database.");
      runPrisma(["db", "push", "--schema", previewSchemaPath]);
    } else {
      console.log("AUTH_PREVIEW_DB_PUSH is not true; skipping Preview schema push.");
    }
  } finally {
    await rm(previewSchemaPath, { force: true });
  }
}
