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
      subscriptionTier: string;
      subscriptionStatus: string;
      trialEndsAt: string | null;
      createdAt: string | null;
    };
  }

  interface User {
    role?: string;
    mustChangePassword?: boolean;
    subscriptionTier?: string;
    subscriptionStatus?: string;
    trialEndsAt?: Date | null;
    createdAt?: Date | null;
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
        token.disabled = false;
        token.mustChangePassword = (user as any).mustChangePassword ?? false;
        token.subscriptionTier = (user as any).subscriptionTier ?? "free";
        token.subscriptionStatus = (user as any).subscriptionStatus ?? "trialing";
        token.trialEndsAt = (user as any).trialEndsAt?.toISOString() ?? null;
        token.createdAt = (user as any).createdAt?.toISOString() ?? null;
        token.lastTouched = Date.now();
      }

      // Throttled refresh — once per 30 minutes while session is active.
      // Updates lastLogin and syncs disabled/role/tier state from DB.
      // Dynamic import: fails silently in Edge Runtime (middleware), works in Node.js.
      const now = Date.now();
      const lastTouched = (token.lastTouched as number) || 0;
      if (token.id && now - lastTouched > 30 * 60 * 1000) {
        try {
          const { prisma: db } = await import("@/lib/prisma");
          const fresh = await db.user.update({
            where: { id: token.id as string },
            data: { lastLogin: new Date() },
            select: { disabled: true, role: true, mustChangePassword: true, subscriptionTier: true, subscriptionStatus: true, trialEndsAt: true, createdAt: true },
          });
          token.disabled = fresh.disabled;
          token.role = fresh.role;
          token.mustChangePassword = fresh.mustChangePassword;
          token.subscriptionTier = fresh.subscriptionTier;
          token.subscriptionStatus = fresh.subscriptionStatus;
          token.trialEndsAt = fresh.trialEndsAt?.toISOString() ?? null;
          token.createdAt = fresh.createdAt?.toISOString() ?? null;
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
      session.user.subscriptionTier = (token.subscriptionTier as string) ?? "free";
      session.user.subscriptionStatus = (token.subscriptionStatus as string) ?? "trialing";
      (session.user as any).trialEndsAt = (token.trialEndsAt as string) ?? null;
      (session.user as any).createdAt = (token.createdAt as string) ?? null;
      (session.user as any).mustChangePassword = token.mustChangePassword ?? false;
      return session;
    },
  },
} satisfies NextAuthConfig;
