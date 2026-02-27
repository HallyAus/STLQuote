import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

const updatePOSchema = z.object({
  status: z.enum(["DRAFT", "ORDERED", "RECEIVED", "CANCELLED"]).optional(),
  expectedDelivery: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  invoiceUrl: z.string().optional().nullable(),
  invoiceFilename: z.string().optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await context.params;

    const po = await prisma.purchaseOrder.findFirst({
      where: { id, userId: user.id },
      include: {
        supplier: true,
        items: {
          include: {
            material: { select: { id: true, materialType: true, brand: true, colour: true, stockQty: true } },
            consumable: { select: { id: true, name: true, category: true, stockQty: true } },
          },
        },
      },
    });

    if (!po) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    return NextResponse.json(po);
  } catch (error) {
    console.error("Failed to fetch purchase order:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase order" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await context.params;

    const existing = await prisma.purchaseOrder.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updatePOSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.expectedDelivery !== undefined) {
      data.expectedDelivery = parsed.data.expectedDelivery
        ? new Date(parsed.data.expectedDelivery)
        : null;
    }
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
    if (parsed.data.invoiceUrl !== undefined) data.invoiceUrl = parsed.data.invoiceUrl;
    if (parsed.data.invoiceFilename !== undefined) data.invoiceFilename = parsed.data.invoiceFilename;

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data,
      include: {
        supplier: true,
        items: {
          include: {
            material: { select: { id: true, materialType: true, brand: true, colour: true, stockQty: true } },
            consumable: { select: { id: true, name: true, category: true, stockQty: true } },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update purchase order:", error);
    return NextResponse.json(
      { error: "Failed to update purchase order" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await context.params;

    const existing = await prisma.purchaseOrder.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    await prisma.purchaseOrder.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete purchase order:", error);
    return NextResponse.json(
      { error: "Failed to delete purchase order" },
      { status: 500 }
    );
  }
}
