import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get("materialId");
    const consumableId = searchParams.get("consumableId");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

    const where: Record<string, unknown> = { userId: user.id };
    if (materialId) where.materialId = materialId;
    if (consumableId) where.consumableId = consumableId;

    const transactions = await prisma.stockTransaction.findMany({
      where,
      include: {
        material: { select: { materialType: true, brand: true, colour: true } },
        consumable: { select: { name: true, category: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Failed to fetch stock transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock transactions" },
      { status: 500 }
    );
  }
}
