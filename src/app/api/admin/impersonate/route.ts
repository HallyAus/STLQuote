import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    // Rate limit: 10 attempts per 60 min per admin
    const rl = rateLimit(`impersonate:${admin.id}`, { windowMs: 60 * 60 * 1000, maxRequests: 10 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many impersonation attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const { userId } = await request.json();
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!target) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Cannot impersonate a SUPER_ADMIN
    if (target.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Cannot impersonate a Super Admin" },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set("impersonate-user-id", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60, // 1 hour
    });

    // Audit log
    log({
      type: "system",
      level: "warn",
      message: `Admin ${admin.email} started impersonating ${target.email}`,
      userId: admin.id,
    });

    return NextResponse.json({ impersonating: target });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Failed to start impersonation:", error);
    return NextResponse.json(
      { error: "Failed to start impersonation" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const admin = await requireAdmin();

    const cookieStore = await cookies();
    cookieStore.delete("impersonate-user-id");

    log({
      type: "system",
      level: "info",
      message: `Admin ${admin.email} stopped impersonation`,
      userId: admin.id,
    });

    return NextResponse.json({ impersonating: null });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Failed to stop impersonation:", error);
    return NextResponse.json(
      { error: "Failed to stop impersonation" },
      { status: 500 }
    );
  }
}
