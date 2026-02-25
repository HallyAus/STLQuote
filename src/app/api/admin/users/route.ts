import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

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
    const adminCount = users.filter((u) => u.role === "ADMIN").length;
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
