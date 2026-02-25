import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

const stockAdjustmentSchema = z.object({
  adjustment: z.number().int("Adjustment must be a whole number"),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await context.params;

    const existing = await prisma.material.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = stockAdjustmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const newQty = existing.stockQty + parsed.data.adjustment;

    if (newQty < 0) {
      return NextResponse.json(
        { error: "Stock quantity cannot go below zero" },
        { status: 400 }
      );
    }

    const updated = await prisma.material.update({
      where: { id },
      data: { stockQty: newQty },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to adjust stock:", error);
    return NextResponse.json(
      { error: "Failed to adjust stock" },
      { status: 500 }
    );
  }
}
