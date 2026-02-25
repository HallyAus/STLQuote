import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { NextAuthConfig } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
  }

  interface User {
    role?: string;
  }
}

/**
 * Shared NextAuth config — no bcryptjs, safe for Edge Runtime (middleware).
 * The Credentials provider with authorize callback lives in auth.ts (Node.js only).
 */
export const authConfig = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [], // Credentials added in auth.ts
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as any).role as string;
        token.lastTouched = Date.now();
      }

      // Throttled lastLogin update — once per 30 minutes while session is active.
      // Dynamic import: fails silently in Edge Runtime (middleware), works in Node.js.
      // Only update lastTouched if the DB write succeeds, so Edge won't block Node.js.
      const now = Date.now();
      const lastTouched = (token.lastTouched as number) || 0;
      if (token.id && now - lastTouched > 30 * 60 * 1000) {
        try {
          const { prisma: db } = await import("@/lib/prisma");
          await db.user.update({
            where: { id: token.id as string },
            data: { lastLogin: new Date() },
          });
          token.lastTouched = now;
        } catch {
          // Edge Runtime or DB error — skip, Node.js will catch it next
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
