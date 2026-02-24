import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TEMP_USER_ID = "temp-user";

export async function GET() {
  try {
    const [
      totalQuotes,
      draftQuotes,
      sentQuotes,
      acceptedQuotes,
      acceptedRevenue,
      totalPrinters,
      allMaterials,
      recentQuotes,
    ] = await Promise.all([
      prisma.quote.count({ where: { userId: TEMP_USER_ID } }),
      prisma.quote.count({
        where: { userId: TEMP_USER_ID, status: "DRAFT" },
      }),
      prisma.quote.count({
        where: { userId: TEMP_USER_ID, status: "SENT" },
      }),
      prisma.quote.count({
        where: { userId: TEMP_USER_ID, status: "ACCEPTED" },
      }),
      prisma.quote.aggregate({
        where: { userId: TEMP_USER_ID, status: "ACCEPTED" },
        _sum: { total: true },
      }),
      prisma.printer.count({ where: { userId: TEMP_USER_ID } }),
      prisma.material.findMany({
        where: { userId: TEMP_USER_ID },
        orderBy: { stockQty: "asc" },
      }),
      prisma.quote.findMany({
        where: { userId: TEMP_USER_ID },
        include: {
          client: { select: { name: true } },
          _count: { select: { lineItems: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Filter low stock materials where stockQty <= lowStockThreshold
    const lowStockAlerts = allMaterials.filter(
      (m) => m.stockQty <= m.lowStockThreshold
    );

    return NextResponse.json({
      stats: {
        totalQuotes,
        draftQuotes,
        sentQuotes,
        acceptedQuotes,
        totalRevenue: acceptedRevenue._sum.total ?? 0,
        totalPrinters,
        totalMaterials: allMaterials.length,
        lowStockMaterials: lowStockAlerts.length,
      },
      recentQuotes,
      lowStockAlerts,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
