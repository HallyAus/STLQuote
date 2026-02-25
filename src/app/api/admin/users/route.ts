import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSuperAdminRole } from "@/lib/auth-helpers";
import { createPasswordResetToken } from "@/lib/tokens";
import { sendAccountCreatedEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["USER", "ADMIN"]).default("USER"), // Only SUPER_ADMIN can create ADMINs (enforced below)
  sendEmail: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();

    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, role, sendEmail } = parsed.data;

    // Only SUPER_ADMIN can create ADMIN users
    if (role === "ADMIN" && !isSuperAdminRole(admin.role)) {
      return NextResponse.json(
        { error: "Only Super Admins can create Admin users" },
        { status: 403 }
      );
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with that email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        disabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Send invitation email with password reset link (non-blocking)
    if (sendEmail) {
      try {
        const resetToken = await createPasswordResetToken(email);
        await sendAccountCreatedEmail(email, name, resetToken, admin.id);
      } catch (emailError) {
        console.error("Failed to send account created email:", emailError);
      }
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Failed to create user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await requireAdmin();

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        disabled: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            quotes: true,
            jobs: true,
            printers: true,
            materials: true,
          },
        },
      },
    });

    // Summary stats
    const totalUsers = users.length;
    const adminCount = users.filter((u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN").length;
    const disabledCount = users.filter((u) => u.disabled).length;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newThisWeek = users.filter(
      (u) => new Date(u.createdAt) >= oneWeekAgo
    ).length;

    return NextResponse.json({
      stats: { totalUsers, adminCount, disabledCount, newThisWeek },
      users,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
