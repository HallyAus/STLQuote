import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await context.params;

    const original = await prisma.quote.findFirst({
      where: { id, userId: user.id },
      include: { lineItems: true },
    });

    if (!original) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Generate new quote number
    const year = new Date().getFullYear();
    const lastQuote = await prisma.quote.findFirst({
      where: {
        userId: user.id,
        quoteNumber: { startsWith: `PF-${year}-` },
      },
      orderBy: { quoteNumber: "desc" },
      select: { quoteNumber: true },
    });

    let nextNum = 1;
    if (lastQuote) {
      const parts = lastQuote.quoteNumber.split("-");
      const lastNum = parseInt(parts[2]);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    const quoteNumber = `PF-${year}-${String(nextNum).padStart(3, "0")}`;

    // Clone quote with line items in a transaction
    const newQuote = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.create({
        data: {
          userId: user.id,
          clientId: original.clientId,
          quoteNumber,
          status: "DRAFT",
          subtotal: original.subtotal,
          markupPct: original.markupPct,
          total: original.total,
          currency: original.currency,
          notes: original.notes,
          terms: original.terms,
          expiryDate: original.expiryDate
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
            : null,
        },
      });

      if (original.lineItems.length > 0) {
        await tx.quoteLineItem.createMany({
          data: original.lineItems.map((li) => ({
            quoteId: quote.id,
            description: li.description,
            printerId: li.printerId,
            materialId: li.materialId,
            printWeightG: li.printWeightG,
            printTimeMinutes: li.printTimeMinutes,
            materialCost: li.materialCost,
            machineCost: li.machineCost,
            labourCost: li.labourCost,
            overheadCost: li.overheadCost,
            lineTotal: li.lineTotal,
            quantity: li.quantity,
            notes: li.notes,
          })),
        });
      }

      return quote;
    });

    return NextResponse.json(newQuote, { status: 201 });
  } catch (error) {
    console.error("Failed to duplicate quote:", error);
    return NextResponse.json(
      { error: "Failed to duplicate quote" },
      { status: 500 }
    );
  }
}
