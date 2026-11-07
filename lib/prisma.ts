import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured for this Worker environment.");
  }

  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });
}

// Export a real PrismaClient instance. Auth.js PrismaAdapter inspects adapter
// methods and properties, so wrapping PrismaClient in a JavaScript Proxy breaks
// adapter introspection and can cause authentication requests to hang.
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
