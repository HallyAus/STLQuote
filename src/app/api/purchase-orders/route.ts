import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

const createPOSchema = z.object({
  supplierId: z.string().min(1),
  expectedDelivery: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    materialId: z.string().optional().nullable(),
    consumableId: z.string().optional().nullable(),
    description: z.string().min(1),
    quantity: z.number().int().min(1),
    unitCost: z.number().min(0),
  })).min(1, "At least one item is required"),
});

async function generatePONumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;

  const lastPO = await prisma.purchaseOrder.findFirst({
    where: { userId, poNumber: { startsWith: prefix } },
    orderBy: { poNumber: "desc" },
    select: { poNumber: true },
  });

  let nextNum = 1;
  if (lastPO) {
    const lastNum = parseInt(lastPO.poNumber.replace(prefix, ""), 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { userId: user.id };
    if (status && status !== "ALL") where.status = status;

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { name: true } },
        items: {
          include: {
            material: { select: { materialType: true, brand: true } },
            consumable: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Failed to fetch purchase orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body = await request.json();
    const parsed = createPOSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify supplier belongs to user
    const supplier = await prisma.supplier.findFirst({
      where: { id: parsed.data.supplierId, userId: user.id },
    });
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const poNumber = await generatePONumber(user.id);
    const totalCost = parsed.data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost, 0
    );

    const po = await prisma.purchaseOrder.create({
      data: {
        userId: user.id,
        supplierId: parsed.data.supplierId,
        poNumber,
        expectedDelivery: parsed.data.expectedDelivery
          ? new Date(parsed.data.expectedDelivery)
          : null,
        notes: parsed.data.notes ?? null,
        totalCost,
        items: {
          create: parsed.data.items.map((item) => ({
            materialId: item.materialId || null,
            consumableId: item.consumableId || null,
            description: item.description,
            quantity: item.quantity,
            unitCost: item.unitCost,
          })),
        },
      },
      include: {
        supplier: { select: { name: true } },
        items: {
          include: {
            material: { select: { materialType: true, brand: true } },
            consumable: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json(po, { status: 201 });
  } catch (error) {
    console.error("Failed to create purchase order:", error);
    return NextResponse.json(
      { error: "Failed to create purchase order" },
      { status: 500 }
    );
  }
}
