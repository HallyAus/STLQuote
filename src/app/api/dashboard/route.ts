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
      totalQuotes,
      draftQuotes,
      sentQuotes,
      acceptedQuotes,
      rejectedQuotes,
      expiredQuotes,
      acceptedRevenue,
      quotesThisMonth,
      recentQuotes,

      // Jobs
      totalJobs,
      jobsByStatus,
      activeJobs,
      printersInActiveJobs,

      // Clients
      totalClients,

      // Printers
      totalPrinters,

      // Materials
      allMaterials,
    ] = await Promise.all([
      // Quote counts
      prisma.quote.count({ where: { userId: user.id } }),
      prisma.quote.count({ where: { userId: user.id, status: "DRAFT" } }),
      prisma.quote.count({ where: { userId: user.id, status: "SENT" } }),
      prisma.quote.count({ where: { userId: user.id, status: "ACCEPTED" } }),
      prisma.quote.count({ where: { userId: user.id, status: "REJECTED" } }),
      prisma.quote.count({ where: { userId: user.id, status: "EXPIRED" } }),
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
      prisma.job.findMany({
        where: {
          userId: user.id,
          status: { in: ACTIVE_JOB_STATUSES },
          printerId: { not: null },
        },
        select: { printerId: true },
        distinct: ["printerId"],
      }),

      // Clients
      prisma.client.count({ where: { userId: user.id } }),

      // Printers
      prisma.printer.count({ where: { userId: user.id } }),

      // Materials
      prisma.material.findMany({
        where: { userId: user.id },
        orderBy: { stockQty: "asc" },
      }),
    ]);

    // Derive job status map
    const jobStatusMap: Record<string, number> = {};
    for (const row of jobsByStatus) {
      jobStatusMap[row.status] = row._count;
    }

    const activeJobCount = ACTIVE_JOB_STATUSES.reduce(
      (sum, s) => sum + (jobStatusMap[s] ?? 0),
      0
    );

    // Stock calculations
    const lowStockAlerts = allMaterials.filter(
      (m) => m.stockQty <= m.lowStockThreshold
    );
    const outOfStockCount = allMaterials.filter((m) => m.stockQty === 0).length;
    const totalStockValue = Math.round(
      allMaterials.reduce((sum, m) => sum + m.price * m.stockQty, 0) * 100
    ) / 100;

    return NextResponse.json({
      stats: {
        totalQuotes,
        draftQuotes,
        sentQuotes,
        acceptedQuotes,
        rejectedQuotes,
        expiredQuotes,
        totalRevenue: acceptedRevenue._sum.total ?? 0,
        quotesThisMonth,
        totalJobs,
        jobStatusMap,
        activeJobCount,
        totalClients,
        totalPrinters,
        printersInUse: printersInActiveJobs.length,
        totalMaterials: allMaterials.length,
        totalStockValue,
        lowStockCount: lowStockAlerts.length,
        outOfStockCount,
      },
      recentQuotes,
      lowStockAlerts,
      activeJobs,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
