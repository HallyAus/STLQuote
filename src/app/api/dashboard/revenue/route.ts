import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    // Last 12 months revenue from ACCEPTED quotes
    const now = new Date();
    const monthsData: { month: string; revenue: number; quotes: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = start.toLocaleDateString("en-AU", { month: "short", year: "2-digit" });

      const acceptedQuotes = await prisma.quote.findMany({
        where: {
          userId: user.id,
          status: "ACCEPTED",
          updatedAt: { gte: start, lt: end },
        },
        select: { total: true },
      });

      monthsData.push({
        month: label,
        revenue: acceptedQuotes.reduce((sum, q) => sum + q.total, 0),
        quotes: acceptedQuotes.length,
      });
    }

    // Conversion rate: accepted / (accepted + rejected + expired)
    const [accepted, total] = await Promise.all([
      prisma.quote.count({
        where: { userId: user.id, status: "ACCEPTED" },
      }),
      prisma.quote.count({
        where: {
          userId: user.id,
          status: { in: ["ACCEPTED", "REJECTED", "EXPIRED"] },
        },
      }),
    ]);
    const conversionRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    // Job completion rate
    const [completedJobs, totalJobs] = await Promise.all([
      prisma.job.count({
        where: { userId: user.id, status: "COMPLETE" },
      }),
      prisma.job.count({
        where: { userId: user.id },
      }),
    ]);
    const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

    return NextResponse.json({
      monthlyRevenue: monthsData,
      conversionRate,
      completionRate,
      totalAccepted: accepted,
      totalDecided: total,
      completedJobs,
      totalJobs,
    });
  } catch (error) {
    console.error("Revenue data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue data" },
      { status: 500 }
    );
  }
}
