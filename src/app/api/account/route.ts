import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        role: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        totpEnabled: true,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Failed to fetch account:", error);
    return NextResponse.json({ error: "Failed to fetch account" }, { status: 500 });
  }
}

const updateSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, "Password must be at least 8 characters").max(72, "Password too long")
      .refine((p) => /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p), { message: "Password must include uppercase, lowercase, and a number" }).optional(),
  })
  .refine(
    (data) => !data.newPassword || data.currentPassword,
    { message: "Current password is required to set a new password", path: ["currentPassword"] }
  );

export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    // Rate limit: 10 updates per 15 min (protects password brute-force via currentPassword)
    const rl = rateLimit(`account-update:${user.id}`, { windowMs: 15 * 60 * 1000, maxRequests: 10 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, currentPassword, newPassword } = parsed.data;
    const data: Record<string, unknown> = {};

    if (name !== undefined) data.name = name;

    // Email change — check uniqueness and reset verification
    if (email !== undefined && email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
      }
      data.email = email;
      data.emailVerified = null; // Require re-verification for new email
    }

    // Password change — verify current password first
    if (newPassword && currentPassword) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { passwordHash: true },
      });

      if (!dbUser?.passwordHash) {
        return NextResponse.json({ error: "No password set on this account" }, { status: 400 });
      }

      const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }

      data.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: { id: true, name: true, email: true, emailVerified: true, createdAt: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update account:", error);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}
