import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL_POOLED ??
    process.env.DATABASE_URL ??
    "postgresql://not-configured:not-configured@localhost:5432/not-configured";

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 10_000
    }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });
}

// Keep one Prisma client (and its pg pool) per warm serverless instance.
// Prisma Postgres exposes a standard PostgreSQL pooled endpoint; the Neon
// driver adapter is not compatible with Prisma Postgres' db.prisma.io host.
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
