import { randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { normalizeProfileUsername } from "@/lib/profile-username";

type ProfileDb = Pick<Prisma.TransactionClient, "profile"> | Pick<PrismaClient, "profile">;
type UserIdentity = { id: string; name?: string | null; email?: string | null; image?: string | null };

export async function ensureProfileForUser(db: ProfileDb, user: UserIdentity) {
  const existing = await db.profile.findUnique({ where: { userId: user.id } });
  if (existing) return existing;

  const source = user.name?.trim() || user.email?.split("@")[0] || "user";
  const base = normalizeProfileUsername(source);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${randomBytes(3).toString("hex")}`;
    const username = `${base.slice(0, 30 - suffix.length)}${suffix}`;
    try {
      return await db.profile.create({
        data: {
          userId: user.id,
          username,
          displayName: user.name?.trim().slice(0, 80) || null,
          avatarUrl: user.image || null
        }
      });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code !== "P2002") throw error;
      const raced = await db.profile.findUnique({ where: { userId: user.id } });
      if (raced) return raced;
    }
  }

  throw new Error("Unable to reserve a unique OCode.js profile username.");
}
