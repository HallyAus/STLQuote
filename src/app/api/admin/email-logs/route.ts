import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (type && type !== "all") {
      where.type = type;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [logs, total, totalAll, sentToday, failedToday] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.emailLog.count({ where }),
      prisma.emailLog.count(),
      prisma.emailLog.count({
        where: { status: "sent", createdAt: { gte: todayStart } },
      }),
      prisma.emailLog.count({
        where: { status: "failed", createdAt: { gte: todayStart } },
      }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalAll,
        sentToday,
        failedToday,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Failed to fetch email logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch email logs" },
      { status: 500 }
    );
  }
}
