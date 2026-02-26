import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const level = searchParams.get("level");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 50;

    const where: Record<string, unknown> = {};
    if (type && type !== "all") where.type = type;
    if (level && level !== "all") where.level = level;

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.systemLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: { page, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
