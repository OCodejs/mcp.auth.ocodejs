import test from "node:test";
import assert from "node:assert/strict";
import { assertPreviewDatabaseTarget } from "../scripts/preview-db-target.mjs";

const direct = "postgresql://user:secret@db-preview.example:5432/authdb?sslmode=require";
const pooled = "postgresql://user:secret@pool-preview.example:6432/authdb?sslmode=require";

test("does not require an allowlist when schema push is disabled", () => {
  assert.equal(assertPreviewDatabaseTarget({ vercelEnv: "preview", pushPreviewSchema: false }), false);
});
test("allows explicit direct and pooled Preview endpoints for one database", () => {
  assert.equal(assertPreviewDatabaseTarget({
    vercelEnv: "preview", pushPreviewSchema: true, databaseUrl: direct, pooledDatabaseUrl: pooled,
    allowedTargets: "db-preview.example:5432/authdb,pool-preview.example:6432/authdb"
  }), true);
});
test("rejects schema push outside Vercel Preview", () => {
  assert.throws(() => assertPreviewDatabaseTarget({
    vercelEnv: "production", pushPreviewSchema: true, databaseUrl: direct,
    allowedTargets: "db-preview.example:5432/authdb"
  }), /VERCEL_ENV=preview/);
});
test("rejects a missing Preview target allowlist", () => {
  assert.throws(() => assertPreviewDatabaseTarget({
    vercelEnv: "preview", pushPreviewSchema: true, databaseUrl: direct
  }), /AUTH_PREVIEW_DB_TARGETS/);
});
test("rejects an endpoint not in the allowlist", () => {
  assert.throws(() => assertPreviewDatabaseTarget({
    vercelEnv: "preview", pushPreviewSchema: true, databaseUrl: direct,
    allowedTargets: "production-db.example:5432/authdb"
  }), /not allowlisted/);
});
test("rejects direct and pooled URLs that identify different databases", () => {
  assert.throws(() => assertPreviewDatabaseTarget({
    vercelEnv: "preview", pushPreviewSchema: true, databaseUrl: direct,
    pooledDatabaseUrl: "postgresql://user:secret@pool-preview.example:6432/otherdb",
    allowedTargets: "db-preview.example:5432/authdb,pool-preview.example:6432/otherdb"
  }), /same database/);
});
test("rejects malformed and non-PostgreSQL URLs", () => {
  assert.throws(() => assertPreviewDatabaseTarget({
    vercelEnv: "preview", pushPreviewSchema: true, databaseUrl: "not-a-url",
    allowedTargets: "db-preview.example:5432/authdb"
  }), /valid PostgreSQL/);
  assert.throws(() => assertPreviewDatabaseTarget({
    vercelEnv: "preview", pushPreviewSchema: true, databaseUrl: "mysql://db-preview.example/authdb",
    allowedTargets: "db-preview.example/authdb"
  }), /PostgreSQL connection URL/);
});
