import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isAdminRole, isSuperAdminRole } from "@/lib/auth-helpers";

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  disabled: z.boolean().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  grantPro: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    // Prevent admin from modifying themselves
    if (id === admin.id) {
      return NextResponse.json(
        { error: "Cannot modify your own account" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // SUPER_ADMIN accounts cannot be modified by anyone
    if (isSuperAdminRole(existing.role)) {
      return NextResponse.json(
        { error: "Super Admin accounts cannot be modified" },
        { status: 403 }
      );
    }

    // Regular ADMINs can only modify USERs, not other ADMINs
    if (isAdminRole(existing.role) && !isSuperAdminRole(admin.role)) {
      return NextResponse.json(
        { error: "Only Super Admins can modify Admin accounts" },
        { status: 403 }
      );
    }

    // Only SUPER_ADMIN can promote to ADMIN
    if (parsed.data.role === "ADMIN" && !isSuperAdminRole(admin.role)) {
      return NextResponse.json(
        { error: "Only Super Admins can promote users to Admin" },
        { status: 403 }
      );
    }

    const { password, grantPro, ...rest } = parsed.data;
    const data: Record<string, unknown> = { ...rest };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 12);
    }

    // Admin can grant or revoke Pro without Stripe
    if (grantPro === true) {
      data.subscriptionTier = "pro";
      data.subscriptionStatus = "active";
      data.trialEndsAt = null;
      data.subscriptionEndsAt = null;
    } else if (grantPro === false) {
      // Only revoke if not on a Stripe subscription
      if (!existing.stripeSubscriptionId) {
        data.subscriptionTier = "free";
        data.subscriptionStatus = "inactive";
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        disabled: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log tier change
    if (grantPro !== undefined) {
      await prisma.subscriptionEvent.create({
        data: {
          userId: id,
          action: grantPro ? "admin_grant_pro" : "admin_revoke_pro",
          detail: `Admin ${admin.email} ${grantPro ? "granted" : "revoked"} Pro access`,
        },
      }).catch(() => {});
    }

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    if (id === admin.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // SUPER_ADMIN accounts cannot be deleted
    if (isSuperAdminRole(existing.role)) {
      return NextResponse.json(
        { error: "Super Admin accounts cannot be deleted" },
        { status: 403 }
      );
    }

    // Regular ADMINs cannot delete other ADMINs
    if (isAdminRole(existing.role) && !isSuperAdminRole(admin.role)) {
      return NextResponse.json(
        { error: "Only Super Admins can delete Admin accounts" },
        { status: 403 }
      );
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: "User deleted" });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Failed to delete user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
