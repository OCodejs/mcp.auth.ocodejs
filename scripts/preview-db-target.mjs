function getDatabaseTarget(connectionString) {
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("A valid PostgreSQL connection URL is required for Preview schema initialization.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Preview schema initialization requires a PostgreSQL connection URL.");
  }
  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  if (!url.host || !database) {
    throw new Error("Preview database host and database name must be present.");
  }
  return { target: url.host + "/" + database, database };
}

export function assertPreviewDatabaseTarget({
  vercelEnv,
  pushPreviewSchema,
  databaseUrl,
  pooledDatabaseUrl,
  allowedTargets
}) {
  if (!pushPreviewSchema) return false;
  if (vercelEnv !== "preview") {
    throw new Error("AUTH_PREVIEW_DB_PUSH is permitted only when VERCEL_ENV=preview.");
  }
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to initialize the Preview schema.");
  }
  const allowlist = new Set(
    String(allowedTargets ?? "").split(",").map((value) => value.trim()).filter(Boolean)
  );
  if (allowlist.size === 0) {
    throw new Error("AUTH_PREVIEW_DB_TARGETS must explicitly allowlist the Preview database host/name.");
  }
  const targets = [databaseUrl, pooledDatabaseUrl].filter(Boolean).map(getDatabaseTarget);
  if (new Set(targets.map((item) => item.database)).size !== 1) {
    throw new Error("DATABASE_URL and DATABASE_URL_POOLED must identify the same database.");
  }
  for (const item of targets) {
    if (!allowlist.has(item.target)) {
      throw new Error("A Preview database endpoint is not allowlisted by AUTH_PREVIEW_DB_TARGETS.");
    }
  }
  return true;
}
