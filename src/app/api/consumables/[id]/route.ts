import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

const updateConsumableSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  category: z
    .enum(["nozzle", "build_plate", "belt", "lubricant", "other"])
    .optional(),
  stockQty: z
    .number()
    .int()
    .min(0, "Stock quantity must be zero or positive")
    .optional(),
  lowStockThreshold: z
    .number()
    .int()
    .min(0, "Threshold must be zero or positive")
    .optional(),
  unitCost: z.number().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  printerId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await context.params;

    const consumable = await prisma.consumable.findFirst({
      where: { id, userId: user.id },
      include: {
        supplier: true,
        printer: true,
      },
    });

    if (!consumable) {
      return NextResponse.json(
        { error: "Consumable not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(consumable);
  } catch (error) {
    console.error("Failed to fetch consumable:", error);
    return NextResponse.json(
      { error: "Failed to fetch consumable" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await context.params;

    // Verify ownership
    const existing = await prisma.consumable.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Consumable not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateConsumableSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const consumable = await prisma.consumable.update({
      where: { id },
      data: parsed.data,
      include: {
        supplier: true,
        printer: true,
      },
    });

    return NextResponse.json(consumable);
  } catch (error) {
    console.error("Failed to update consumable:", error);
    return NextResponse.json(
      { error: "Failed to update consumable" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await context.params;

    // Verify ownership
    const existing = await prisma.consumable.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Consumable not found" },
        { status: 404 }
      );
    }

    await prisma.consumable.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete consumable:", error);
    return NextResponse.json(
      { error: "Failed to delete consumable" },
      { status: 500 }
    );
  }
}
