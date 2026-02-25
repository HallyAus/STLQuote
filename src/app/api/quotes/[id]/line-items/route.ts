import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

const createLineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  printerId: z.string().optional().nullable(),
  materialId: z.string().optional().nullable(),
  printWeightG: z.number().min(0).default(0),
  printTimeMinutes: z.number().min(0).default(0),
  materialCost: z.number().min(0).default(0),
  machineCost: z.number().min(0).default(0),
  labourCost: z.number().min(0).default(0),
  overheadCost: z.number().min(0).default(0),
  lineTotal: z.number().min(0).default(0),
  quantity: z.number().int().min(1).default(1),
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

    const { id: quoteId } = await context.params;

    // Verify ownership
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, userId: user.id },
      include: { lineItems: true },
    });

    if (!quote) {
      return NextResponse.json(
        { error: "Quote not found" },
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
      const created = await tx.quoteLineItem.create({
        data: {
          ...parsed.data,
          quoteId,
        },
      });

      // Fetch all line items to recalculate
      const allLineItems = await tx.quoteLineItem.findMany({
        where: { quoteId },
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
