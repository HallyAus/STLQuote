import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { roundCurrency } from "@/lib/utils";

const createLineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0).default(0),
  lineTotal: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id: invoiceId } = await context.params;

    // Verify ownership
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId: user.id },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = createLineItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Create line item and recalculate totals in a transaction
    const lineItem = await prisma.$transaction(async (tx) => {
      const created = await tx.invoiceLineItem.create({
        data: {
          ...parsed.data,
          invoiceId,
        },
      });

      // Fetch all line items to recalculate
      const allLineItems = await tx.invoiceLineItem.findMany({
        where: { invoiceId },
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

      return created;
    });

    return NextResponse.json(lineItem, { status: 201 });
  } catch (error) {
    console.error("Failed to add line item:", error);
    return NextResponse.json(
      { error: "Failed to add line item" },
      { status: 500 }
    );
  }
}
