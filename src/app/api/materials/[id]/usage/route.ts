import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await context.params;

    const material = await prisma.material.findFirst({
      where: { id, userId: user.id },
      select: { id: true, price: true, spoolWeightG: true },
    });

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    // Get all stock transactions for this material
    const transactions = await prisma.stockTransaction.findMany({
      where: { materialId: id, userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    // Aggregate usage stats
    const totalReceived = transactions
      .filter((t) => t.quantity > 0)
      .reduce((sum, t) => sum + t.quantity, 0);

    const totalUsed = transactions
      .filter((t) => t.quantity < 0)
      .reduce((sum, t) => sum + Math.abs(t.quantity), 0);

    const autoDeducts = transactions.filter((t) => t.type === "auto_deduct");
    const jobCount = autoDeducts.length;

    const avgPerJob = jobCount > 0 ? totalUsed / jobCount : 0;

    // Cost of goods: total used * price per spool
    const costOfGoods = totalUsed * material.price;

    // Monthly usage (group by month)
    const monthlyUsage: Record<string, number> = {};
    for (const t of transactions) {
      if (t.quantity < 0) {
        const month = new Date(t.createdAt).toISOString().slice(0, 7); // YYYY-MM
        monthlyUsage[month] = (monthlyUsage[month] ?? 0) + Math.abs(t.quantity);
      }
    }

    // Recent 6 months
    const months = Object.entries(monthlyUsage)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, used]) => ({ month, used }));

    return NextResponse.json({
      totalReceived,
      totalUsed,
      jobCount,
      avgPerJob: Math.round(avgPerJob * 100) / 100,
      costOfGoods: Math.round(costOfGoods * 100) / 100,
      transactionCount: transactions.length,
      months,
    });
  } catch (error) {
    console.error("Failed to fetch material usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage stats" },
      { status: 500 }
    );
  }
}
