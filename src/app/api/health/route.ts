import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const version = process.env.npm_package_version ?? "unknown";

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      version,
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        version,
        database: "disconnected",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
