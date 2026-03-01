import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Run all queries in parallel
    const [
      // User signups per day (last 30 days)
      signupsByDay,
      // Quotes created per day with status (last 30 days)
      quotesByDay,
      // Quote conversion stats
      quoteConversion,
      // Revenue from accepted quotes (last 30 days, weekly buckets)
      acceptedQuotesRevenue,
      // Top 5 most active users
      topUsers,
      // Per-user storage stats
      userStorage,
      // System health: table counts
      tableCounts,
      // User stats for overview cards
      totalUsers,
      newUsersThisWeek,
      activeJobsCount,
      pendingRequestsCount,
      quotesThisMonth,
      // Recent system logs
      recentLogs,
    ] = await Promise.all([
      // Signups by day
      prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE("createdAt") as date, COUNT(*)::int as count
        FROM "User"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,

      // Quotes by day with status
      prisma.$queryRaw<{ date: string; status: string; count: bigint }[]>`
        SELECT DATE("createdAt") as date, status::text, COUNT(*)::int as count
        FROM "Quote"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt"), status
        ORDER BY date ASC
      `,

      // Quote conversion rate
      prisma.$queryRaw<{ total: bigint; accepted: bigint }[]>`
        SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE status = 'ACCEPTED')::int as accepted
        FROM "Quote"
        WHERE "createdAt" >= ${thirtyDaysAgo}
      `,

      // Revenue from accepted quotes by week
      prisma.$queryRaw<{ week: string; revenue: number }[]>`
        SELECT
          DATE_TRUNC('week', "updatedAt")::date::text as week,
          COALESCE(SUM(total), 0)::float as revenue
        FROM "Quote"
        WHERE status = 'ACCEPTED' AND "updatedAt" >= ${thirtyDaysAgo}
        GROUP BY DATE_TRUNC('week', "updatedAt")
        ORDER BY week ASC
      `,

      // Top 5 users by activity (sorted in DB)
      prisma.$queryRaw<Array<{
        id: string;
        name: string | null;
        email: string;
        lastLogin: Date | null;
        quotesCount: bigint;
        jobsCount: bigint;
      }>>`
        SELECT u.id, u.name, u.email, u."lastLogin",
               COUNT(DISTINCT q.id)::bigint as "quotesCount",
               COUNT(DISTINCT j.id)::bigint as "jobsCount"
        FROM "User" u
        LEFT JOIN "Quote" q ON q."userId" = u.id
        LEFT JOIN "Job" j ON j."userId" = u.id
        GROUP BY u.id
        ORDER BY COUNT(DISTINCT q.id) + COUNT(DISTINCT j.id) DESC
        LIMIT 5
      `,

      // Per-user storage from QuoteRequest + JobPhoto
      prisma.$queryRaw<{ userId: string; totalBytes: bigint; fileCount: bigint }[]>`
        SELECT "userId",
          COALESCE(SUM("fileSizeBytes"), 0)::bigint as "totalBytes",
          COUNT(*)::bigint as "fileCount"
        FROM (
          SELECT "userId", "fileSizeBytes" FROM "QuoteRequest"
          UNION ALL
          SELECT j."userId", jp."sizeBytes" as "fileSizeBytes"
          FROM "JobPhoto" jp
          JOIN "Job" j ON j.id = jp."jobId"
        ) combined
        GROUP BY "userId"
        ORDER BY "totalBytes" DESC
        LIMIT 10
      `,

      // Table counts for system health
      Promise.all([
        prisma.user.count(),
        prisma.quote.count(),
        prisma.job.count(),
        prisma.material.count(),
        prisma.printer.count(),
        prisma.client.count(),
        prisma.invoice.count(),
      ]).then(([users, quotes, jobs, materials, printers, clients, invoices]) => ({
        users,
        quotes,
        jobs,
        materials,
        printers,
        clients,
        invoices,
      })),

      // Total users
      prisma.user.count(),

      // New users this week
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Active jobs
      prisma.job.count({
        where: {
          status: { notIn: ["COMPLETE", "SHIPPED"] },
        },
      }),

      // Pending quote requests
      prisma.quoteRequest.count({
        where: { status: "PENDING" },
      }),

      // Quotes this month
      prisma.quote.count({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
      }),

      // Recent system logs
      prisma.systemLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          level: true,
          message: true,
          createdAt: true,
        },
      }),
    ]);

    // Uploads directory size
    let uploadsDirSizeBytes = 0;
    try {
      const uploadsDir = path.join(process.cwd(), "uploads");
      if (fs.existsSync(uploadsDir)) {
        uploadsDirSizeBytes = await getDirSizeAsync(uploadsDir);
      }
    } catch {
      // Ignore filesystem errors
    }

    // Build 30-day daily arrays with zero-fill
    function toDateKey(d: unknown): string {
      if (d instanceof Date) return d.toISOString().split("T")[0];
      const s = String(d);
      return s.includes("T") ? s.split("T")[0] : s.slice(0, 10);
    }

    const signupsMap = new Map<string, number>();
    for (const row of signupsByDay) {
      signupsMap.set(toDateKey(row.date), Number(row.count));
    }

    const quotesMap = new Map<string, Record<string, number>>();
    for (const row of quotesByDay) {
      const dateStr = toDateKey(row.date);
      if (!quotesMap.has(dateStr)) quotesMap.set(dateStr, {});
      quotesMap.get(dateStr)![row.status] = Number(row.count);
    }

    const dailySignups: { date: string; count: number }[] = [];
    const dailyQuotes: { date: string; draft: number; sent: number; accepted: number; other: number }[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];

      dailySignups.push({ date: dateStr, count: signupsMap.get(dateStr) || 0 });

      const dayQuotes = quotesMap.get(dateStr) || {};
      dailyQuotes.push({
        date: dateStr,
        draft: dayQuotes["DRAFT"] || 0,
        sent: dayQuotes["SENT"] || 0,
        accepted: dayQuotes["ACCEPTED"] || 0,
        other: (dayQuotes["REJECTED"] || 0) + (dayQuotes["EXPIRED"] || 0),
      });
    }

    const conversionRate =
      quoteConversion[0] && Number(quoteConversion[0].total) > 0
        ? Math.round((Number(quoteConversion[0].accepted) / Number(quoteConversion[0].total)) * 100)
        : 0;

    // Build user storage map
    const storageMap = new Map<string, { totalBytes: number; fileCount: number }>();
    for (const row of userStorage) {
      storageMap.set(row.userId, {
        totalBytes: Number(row.totalBytes),
        fileCount: Number(row.fileCount),
      });
    }

    // Enhance top users with storage (convert bigint from raw SQL to number)
    const topUsersWithStorage = topUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      lastLogin: u.lastLogin,
      quotesCount: Number(u.quotesCount),
      jobsCount: Number(u.jobsCount),
      storage: storageMap.get(u.id) || { totalBytes: 0, fileCount: 0 },
    }));

    return NextResponse.json({
      overview: {
        totalUsers,
        newUsersThisWeek,
        quotesThisMonth,
        conversionRate,
        activeJobs: activeJobsCount,
        pendingRequests: pendingRequestsCount,
      },
      charts: {
        dailySignups,
        dailyQuotes,
        weeklyRevenue: acceptedQuotesRevenue.map((r) => ({
          week: r.week,
          revenue: Number(r.revenue),
        })),
      },
      topUsers: topUsersWithStorage,
      system: {
        tableCounts,
        uploadsDirSizeBytes,
      },
      recentLogs,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

async function getDirSizeAsync(dirPath: string): Promise<number> {
  let size = 0;
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        size += await getDirSizeAsync(fullPath);
      } else if (entry.isFile()) {
        const stat = await fs.promises.stat(fullPath);
        size += stat.size;
      }
    }
  } catch {
    // Ignore permission errors
  }
  return size;
}
