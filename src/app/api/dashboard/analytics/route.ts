import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await requireFeature("dashboard_analytics");

    const [printers, topMaterials, avgMarkup] = await Promise.all([
      // Printer utilisation
      prisma.printer.findMany({
        where: { userId: user.id },
        select: {
          name: true,
          currentHours: true,
          lifetimeHours: true,
        },
        orderBy: { name: "asc" },
      }),

      // Top 5 materials by QuoteLineItem usage
      prisma.quoteLineItem.groupBy({
        by: ["materialId"],
        where: {
          materialId: { not: null },
          quote: { userId: user.id },
        },
        _count: { materialId: true },
        orderBy: { _count: { materialId: "desc" } },
        take: 5,
      }),

      // Average markup across non-DRAFT quotes
      prisma.quote.aggregate({
        where: {
          userId: user.id,
          status: { not: "DRAFT" },
        },
        _avg: { markupPct: true },
      }),
    ]);

    // Build printer utilisation array
    const printerUtilisation = printers.map((p) => ({
      name: p.name,
      utilisation:
        p.lifetimeHours > 0
          ? Math.round((p.currentHours / p.lifetimeHours) * 100 * 10) / 10
          : 0,
    }));

    // Resolve material details for the top materials
    const materialIds = topMaterials
      .map((m) => m.materialId)
      .filter((id): id is string => id !== null);

    const materials =
      materialIds.length > 0
        ? await prisma.material.findMany({
            where: { id: { in: materialIds } },
            select: { id: true, materialType: true, brand: true },
          })
        : [];

    const materialMap = new Map(materials.map((m) => [m.id, m]));

    const topMaterialsResult = topMaterials.map((row) => {
      const mat = row.materialId ? materialMap.get(row.materialId) : null;
      return {
        materialType: mat?.materialType ?? "Unknown",
        brand: mat?.brand ?? null,
        count: row._count.materialId,
      };
    });

    const averageMarkup = Math.round((avgMarkup._avg.markupPct ?? 0) * 10) / 10;

    return NextResponse.json({
      printerUtilisation,
      topMaterials: topMaterialsResult,
      averageMarkup,
    });
  } catch (error) {
    console.error("Failed to fetch analytics data:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
