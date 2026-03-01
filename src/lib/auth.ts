import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { rateLimit } from "@/lib/rate-limit";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase();

/**
 * Full NextAuth instance with Credentials + Microsoft Entra ID providers.
 * Middleware imports from auth.config.ts instead to avoid Edge Runtime warnings.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Rate limit: 10 attempts per 15 minutes per email
        const rl = rateLimit(`login:${email.toLowerCase()}`, {
          windowMs: 15 * 60 * 1000,
          maxRequests: 10,
        });
        if (rl.limited) {
          throw new Error("Too many login attempts. Please try again later.");
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        if (user.disabled) {
          throw new Error("Account is disabled. Contact your administrator.");
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) {
          return null;
        }

        // Enforce email verification for regular users (admins skip)
        if (!user.emailVerified && user.role === "USER") {
          throw new Error("Please verify your email before signing in. Check your inbox.");
        }

        // Record last login time
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          createdAt: user.createdAt,
          requiresTwoFactor: user.totpEnabled ?? false,
          totpEnabled: user.totpEnabled ?? false,
        };
      },
    }),
    MicrosoftEntraId({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: `https://login.microsoftonline.com/common/v2.0`,
      authorization: {
        params: { scope: "openid profile email User.Read" },
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      // Credentials provider handles its own checks in authorize()
      if (account?.provider === "credentials") return true;

      // OAuth sign-in checks
      if (user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, disabled: true },
        });

        // Block disabled users
        if (existingUser?.disabled) {
          return "/login?error=AccountDisabled";
        }

      }

      return true;
    },
  },
  events: {
    // Fires when PrismaAdapter creates a new user via OAuth
    async createUser({ user }) {
      if (!user.id || !user.email) return;

      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

      const isAdmin = ADMIN_EMAIL && user.email.toLowerCase() === ADMIN_EMAIL;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
          role: isAdmin ? "SUPER_ADMIN" : "USER",
          subscriptionTier: "hobby",
          subscriptionStatus: "trialing",
          trialEndsAt: trialEnd,
          lastLogin: new Date(),
        },
      });
    },
  },
});
