import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createPreviewSchema } from "../scripts/prisma-schema.mjs";

const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");

test("the checked-in Prisma schema stays on the default public schema", () => {
  assert.doesNotMatch(schema, /@@schema\(/);
  assert.doesNotMatch(schema, /schemas\s*=/);
});

test("Preview maps every Prisma model to auth_preview", () => {
  const preview = createPreviewSchema(schema);
  const modelCount = (schema.match(/^model\s+\w+\s*\{/gm) ?? []).length;
  const mappedCount = (preview.match(/@@schema\("auth_preview"\)/g) ?? []).length;

  assert.equal(modelCount, 9);
  assert.equal(mappedCount, modelCount);
  assert.match(preview, /schemas\s*=\s*\["public",\s*"auth_preview"\]/);
});
