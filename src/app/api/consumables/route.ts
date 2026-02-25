import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

const createConsumableSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z
    .enum(["nozzle", "build_plate", "belt", "lubricant", "other"])
    .default("other"),
  stockQty: z
    .number()
    .int()
    .min(0, "Stock quantity must be zero or positive")
    .default(0),
  lowStockThreshold: z
    .number()
    .int()
    .min(0, "Threshold must be zero or positive")
    .default(1),
  unitCost: z.number().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  printerId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const consumables = await prisma.consumable.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      include: {
        supplier: true,
        printer: true,
      },
      take: 500,
    });

    return NextResponse.json(consumables);
  } catch (error) {
    console.error("Failed to fetch consumables:", error);
    return NextResponse.json(
      { error: "Failed to fetch consumables" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body = await request.json();
    const parsed = createConsumableSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Clean up empty strings to null
    const data = {
      ...parsed.data,
      supplierId: parsed.data.supplierId?.trim() || null,
      printerId: parsed.data.printerId?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
    };

    const consumable = await prisma.consumable.create({
      data: {
        ...data,
        userId: user.id,
      },
      include: {
        supplier: true,
        printer: true,
      },
    });

    return NextResponse.json(consumable, { status: 201 });
  } catch (error) {
    console.error("Failed to create consumable:", error);
    return NextResponse.json(
      { error: "Failed to create consumable" },
      { status: 500 }
    );
  }
}
