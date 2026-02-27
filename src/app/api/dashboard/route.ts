import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth-helpers";

const ACTIVE_JOB_STATUSES: JobStatus[] = [
  "QUEUED",
  "PRINTING",
  "POST_PROCESSING",
  "QUALITY_CHECK",
  "PACKING",
];

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      // Quotes
      quotesByStatus,
      acceptedRevenue,
      quotesThisMonth,
      recentQuotes,

      // Jobs
      totalJobs,
      jobsByStatus,
      activeJobs,

      // Clients
      totalClients,

      // Printers
      totalPrinters,

      // Materials (low-stock rows + aggregate stats)
      lowStockMaterials,
      materialStats,

      // Consumables (low-stock only)
      lowStockConsumableRows,

      // Job revenue (Shopify etc)
      jobRevenue,
    ] = await Promise.all([
      // Single groupBy replaces 6 separate count queries
      prisma.quote.groupBy({
        by: ["status"],
        where: { userId: user.id },
        _count: true,
      }),
      prisma.quote.aggregate({
        where: { userId: user.id, status: "ACCEPTED" },
        _sum: { total: true },
      }),
      prisma.quote.count({
        where: { userId: user.id, createdAt: { gte: startOfMonth } },
      }),
      prisma.quote.findMany({
        where: { userId: user.id },
        include: {
          client: { select: { name: true } },
          _count: { select: { lineItems: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // Job counts
      prisma.job.count({ where: { userId: user.id } }),
      prisma.job.groupBy({
        by: ["status"],
        where: { userId: user.id },
        _count: true,
      }),
      prisma.job.findMany({
        where: {
          userId: user.id,
          status: { in: ACTIVE_JOB_STATUSES },
        },
        include: {
          quote: { select: { quoteNumber: true } },
          printer: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // Clients
      prisma.client.count({ where: { userId: user.id } }),

      // Printers
      prisma.printer.count({ where: { userId: user.id } }),

      // Low-stock materials (filter at DB level instead of fetching all)
      prisma.$queryRaw<Array<{ id: string; type: string; materialType: string; brand: string; colour: string; stockQty: number; lowStockThreshold: number; price: number; supplierName: string | null; supplierEmail: string | null; supplierWebsite: string | null }>>`
        SELECT m.id, m.type, m."materialType", m.brand, m.colour, m."stockQty", m."lowStockThreshold", m.price,
               s.name as "supplierName", s.email as "supplierEmail", s.website as "supplierWebsite"
        FROM "Material" m
        LEFT JOIN "Supplier" s ON m."supplierId" = s.id
        WHERE m."userId" = ${user.id} AND m."stockQty" <= m."lowStockThreshold"
        ORDER BY m."stockQty" ASC
      `,
      // Total material stats
      prisma.$queryRaw<[{ count: bigint; outOfStock: bigint; totalValue: number }]>`
        SELECT COUNT(*)::bigint as count,
               COUNT(*) FILTER (WHERE "stockQty" = 0)::bigint as "outOfStock",
               COALESCE(SUM(price * "stockQty"), 0)::float as "totalValue"
        FROM "Material" WHERE "userId" = ${user.id}
      `,

      // Consumables (low-stock only, filtered at DB level)
      prisma.$queryRaw<Array<{ id: string; name: string; category: string | null; stockQty: number; lowStockThreshold: number; supplierName: string | null; supplierEmail: string | null; supplierWebsite: string | null }>>`
        SELECT c.id, c.name, c.category, c."stockQty", c."lowStockThreshold",
               s.name as "supplierName", s.email as "supplierEmail", s.website as "supplierWebsite"
        FROM "Consumable" c
        LEFT JOIN "Supplier" s ON c."supplierId" = s.id
        WHERE c."userId" = ${user.id} AND c."stockQty" <= c."lowStockThreshold"
        ORDER BY c."stockQty" ASC
      `,

      // Job revenue (jobs with price but no quote — e.g. Shopify imports)
      prisma.job.aggregate({
        where: { userId: user.id, price: { not: null }, quoteId: null },
        _sum: { price: true },
      }),
    ]);

    // Derive quote status counts from single groupBy
    const quoteStatusMap: Record<string, number> = {};
    for (const row of quotesByStatus) {
      quoteStatusMap[row.status] = row._count;
    }
    const totalQuotes = Object.values(quoteStatusMap).reduce((a, b) => a + b, 0);
    const draftQuotes = quoteStatusMap["DRAFT"] ?? 0;
    const sentQuotes = quoteStatusMap["SENT"] ?? 0;
    const acceptedQuotes = quoteStatusMap["ACCEPTED"] ?? 0;
    const rejectedQuotes = quoteStatusMap["REJECTED"] ?? 0;
    const expiredQuotes = quoteStatusMap["EXPIRED"] ?? 0;

    // Derive job status map
    const jobStatusMap: Record<string, number> = {};
    for (const row of jobsByStatus) {
      jobStatusMap[row.status] = row._count;
    }

    const activeJobCount = ACTIVE_JOB_STATUSES.reduce(
      (sum, s) => sum + (jobStatusMap[s] ?? 0),
      0
    );

    // Derive printers in use from activeJobs (no separate query needed)
    const printersInUse = new Set(activeJobs.filter(j => j.printerId).map(j => j.printerId)).size;

    // Map raw SQL results to response shape
    const lowStockAlerts = lowStockMaterials.map((m) => ({
      id: m.id,
      type: m.type,
      materialType: m.materialType,
      brand: m.brand,
      colour: m.colour,
      stockQty: m.stockQty,
      lowStockThreshold: m.lowStockThreshold,
      price: m.price,
      supplier: m.supplierName ? { name: m.supplierName, email: m.supplierEmail, website: m.supplierWebsite } : null,
    }));

    const totalMaterials = Number(materialStats[0]?.count ?? 0);
    const outOfStockCount = Number(materialStats[0]?.outOfStock ?? 0);
    const totalStockValue = Math.round((materialStats[0]?.totalValue ?? 0) * 100) / 100;

    const lowStockConsumables = lowStockConsumableRows.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      stockQty: c.stockQty,
      lowStockThreshold: c.lowStockThreshold,
      supplier: c.supplierName ? { name: c.supplierName, email: c.supplierEmail, website: c.supplierWebsite } : null,
    }));

    return NextResponse.json({
      stats: {
        totalQuotes,
        draftQuotes,
        sentQuotes,
        acceptedQuotes,
        rejectedQuotes,
        expiredQuotes,
        totalRevenue: (acceptedRevenue._sum.total ?? 0) + (jobRevenue._sum.price ?? 0),
        quotesThisMonth,
        totalJobs,
        jobStatusMap,
        activeJobCount,
        totalClients,
        totalPrinters,
        printersInUse,
        totalMaterials,
        totalStockValue,
        lowStockCount: lowStockAlerts.length,
        outOfStockCount,
      },
      recentQuotes,
      lowStockAlerts,
      activeJobs,
      consumableAlerts: lowStockConsumables,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
