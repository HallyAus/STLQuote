import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";
import { roundCurrency } from "@/lib/utils";

const updateLineItemSchema = z.object({
  description: z.string().min(1, "Description is required").optional(),
  quantity: z.number().int().min(1).optional(),
  unitPrice: z.number().min(0).optional(),
  lineTotal: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string; lineItemId: string }> };

async function recalculateInvoiceTotals(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  invoiceId: string
) {
  const allLineItems = await tx.invoiceLineItem.findMany({
    where: { invoiceId },
  });

  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
  });

  const subtotal = roundCurrency(
    allLineItems.reduce((sum, item) => sum + item.lineTotal, 0)
  );
  const tax = roundCurrency(subtotal * invoice.taxPct / 100);
  const total = roundCurrency(subtotal + tax);

  await tx.invoice.update({
    where: { id: invoiceId },
    data: { subtotal, tax, total },
  });
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireFeature("invoicing");

    const { id: invoiceId, lineItemId } = await context.params;

    // Verify invoice ownership
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId: user.id },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Verify line item belongs to this invoice
    const existingLineItem = await prisma.invoiceLineItem.findFirst({
      where: { id: lineItemId, invoiceId },
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
      const updated = await tx.invoiceLineItem.update({
        where: { id: lineItemId },
        data: parsed.data,
      });

      await recalculateInvoiceTotals(tx, invoiceId);

      return updated;
    });

    return NextResponse.json(lineItem);
  } catch (error) {
    if (error instanceof Response) return error;
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
    const user = await requireFeature("invoicing");

    const { id: invoiceId, lineItemId } = await context.params;

    // Verify invoice ownership
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId: user.id },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Verify line item belongs to this invoice
    const existingLineItem = await prisma.invoiceLineItem.findFirst({
      where: { id: lineItemId, invoiceId },
    });

    if (!existingLineItem) {
      return NextResponse.json(
        { error: "Line item not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.invoiceLineItem.delete({ where: { id: lineItemId } });
      await recalculateInvoiceTotals(tx, invoiceId);
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Failed to delete line item:", error);
    return NextResponse.json(
      { error: "Failed to delete line item" },
      { status: 500 }
    );
  }
}
