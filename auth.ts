import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureProfileForUser } from "@/lib/profiles";
import { createOptionalOidcProvider } from "@/lib/auth-oidc";
import { enforceAuthRateLimit } from "@/lib/rate-limit";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128)
});

const prismaAdapter = PrismaAdapter(prisma);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: {
    ...prismaAdapter,
    async linkAccount(account) {
      try {
        return await prismaAdapter.linkAccount!(account);
      } catch (error) {
        // Two first-time callbacks can both create a user before one wins the
        // unique (provider, providerAccountId) account insert. Never leave the
        // losing, unlinked user/profile behind or authenticate it as the winner.
        if ((error as { code?: string })?.code === "P2002") {
          const winner = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId
              }
            },
            select: { userId: true }
          });

          if (winner && winner.userId !== account.userId) {
            await prisma.user.deleteMany({
              where: { id: account.userId, accounts: { none: {} } }
            });
            // Fail closed. The next authorization attempt resolves through
            // getUserByAccount to the winning account rather than the loser.
            throw new Error("This identity was linked by another sign-in attempt. Please retry sign-in.");
          }
        }
        throw error;
      }
    }
  },
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/dang-nhap" },
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET
    })] : []),
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET ? [GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET
    })] : []),
    ...createOptionalOidcProvider(),
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();
        const rateLimit = await enforceAuthRateLimit(request, "login", email);
        if (!rateLimit.allowed) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const valid = await compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      }
    })
  ],
  events: {
    async createUser({ user }) {
      if (user.id) await ensureProfileForUser(prisma, user as { id: string; name?: string | null; email?: string | null; image?: string | null });
    }
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    }
  }
});
