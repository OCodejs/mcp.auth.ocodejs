import { execFileSync } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import { createPreviewSchema } from "./prisma-schema.mjs";

const schemaPath = "prisma/schema.prisma";
const previewSchemaPath = "prisma/.schema.preview.prisma";
const isPreview = process.env.VERCEL_ENV === "preview";
const pushPreviewSchema = process.env.AUTH_PREVIEW_DB_PUSH === "true";

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
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is required to initialize the Preview schema.");
      }
      console.log("Applying Prisma schema to auth_preview (Preview only).");
      runPrisma(["db", "push", "--schema", previewSchemaPath]);
    } else {
      console.log("AUTH_PREVIEW_DB_PUSH is not true; skipping Preview schema push.");
    }
  } finally {
    await rm(previewSchemaPath, { force: true });
  }
}
