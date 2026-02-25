import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

const updateLineItemSchema = z.object({
  description: z.string().min(1, "Description is required").optional(),
  printerId: z.string().optional().nullable(),
  materialId: z.string().optional().nullable(),
  printWeightG: z.number().min(0).optional(),
  printTimeMinutes: z.number().min(0).optional(),
  materialCost: z.number().min(0).optional(),
  machineCost: z.number().min(0).optional(),
  labourCost: z.number().min(0).optional(),
  overheadCost: z.number().min(0).optional(),
  lineTotal: z.number().min(0).optional(),
  quantity: z.number().int().min(1).optional(),
  notes: z.string().optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string; lineItemId: string }> };

async function recalculateQuoteTotals(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  quoteId: string
) {
  const allLineItems = await tx.quoteLineItem.findMany({
    where: { quoteId },
  });

  const quote = await tx.quote.findUniqueOrThrow({
    where: { id: quoteId },
  });

  const subtotal = Math.round(
    allLineItems.reduce(
      (sum, item) => sum + item.lineTotal * item.quantity,
      0
    ) * 100
  ) / 100;

  const total = Math.round(
    subtotal * (1 + quote.markupPct / 100) * 100
  ) / 100;

  await tx.quote.update({
    where: { id: quoteId },
    data: { subtotal, total },
  });
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id: quoteId, lineItemId } = await context.params;

    // Verify quote ownership
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, userId: user.id },
    });

    if (!quote) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    // Verify line item belongs to this quote
    const existingLineItem = await prisma.quoteLineItem.findFirst({
      where: { id: lineItemId, quoteId },
    });

    if (!existingLineItem) {
      return NextResponse.json(
        { error: "Line item not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateLineItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const lineItem = await prisma.$transaction(async (tx) => {
      const updated = await tx.quoteLineItem.update({
        where: { id: lineItemId },
        data: parsed.data,
      });

      await recalculateQuoteTotals(tx, quoteId);

      return updated;
    });

    return NextResponse.json(lineItem);
  } catch (error) {
    console.error("Failed to update line item:", error);
    return NextResponse.json(
      { error: "Failed to update line item" },
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

    const { id: quoteId, lineItemId } = await context.params;

    // Verify quote ownership
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, userId: user.id },
    });

    if (!quote) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    // Verify line item belongs to this quote
    const existingLineItem = await prisma.quoteLineItem.findFirst({
      where: { id: lineItemId, quoteId },
    });

    if (!existingLineItem) {
      return NextResponse.json(
        { error: "Line item not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.quoteLineItem.delete({ where: { id: lineItemId } });
      await recalculateQuoteTotals(tx, quoteId);
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete line item:", error);
    return NextResponse.json(
      { error: "Failed to delete line item" },
      { status: 500 }
    );
  }
}
