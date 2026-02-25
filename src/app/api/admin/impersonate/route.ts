import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const { userId } = await request.json();
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!target) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set("impersonate-user-id", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hour
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
    await requireAdmin();

    const cookieStore = await cookies();
    cookieStore.delete("impersonate-user-id");

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
