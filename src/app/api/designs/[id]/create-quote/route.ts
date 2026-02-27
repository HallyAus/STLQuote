import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";

async function generateQuoteNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PF-${year}-`;
  const latest = await prisma.quote.findFirst({
    where: { userId, quoteNumber: { startsWith: prefix } },
    orderBy: { quoteNumber: "desc" },
    select: { quoteNumber: true },
  });
  let nextSeq = 1;
  if (latest?.quoteNumber) {
    const seqStr = latest.quoteNumber.replace(prefix, "");
    const lastSeq = parseInt(seqStr, 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }
  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireFeature("design_studio");
    const { id } = await params;

    const design = await prisma.design.findFirst({
      where: { id, userId: user.id },
      include: { client: { select: { id: true } } },
    });
    if (!design) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    // Build description from design
    const descParts = [`Design: ${design.designNumber} — ${design.name}`];
    if (design.description) descParts.push(design.description);
    if (design.suggestedMaterial) descParts.push(`Material: ${design.suggestedMaterial}`);
    if (design.suggestedColour) descParts.push(`Colour: ${design.suggestedColour}`);
    if (design.targetLengthMm || design.targetWidthMm || design.targetHeightMm) {
      descParts.push(`Dimensions: ${design.targetLengthMm ?? "?"}L × ${design.targetWidthMm ?? "?"}W × ${design.targetHeightMm ?? "?"}H mm`);
    }

    // Fetch settings for defaults
    const settings = await prisma.settings.findFirst({
      where: { userId: user.id },
      select: { defaultMarkupPct: true, defaultTaxPct: true, taxLabel: true, taxInclusive: true },
    });

    const quoteNumber = await generateQuoteNumber(user.id);
    const markupPct = settings?.defaultMarkupPct ?? 0;
    const taxPct = settings?.defaultTaxPct ?? 10;

    // Build line item from design estimates
    const lineItems: Array<{
      description: string;
      printWeightG: number;
      printTimeMinutes: number;
      materialCost: number;
      machineCost: number;
      labourCost: number;
      overheadCost: number;
      lineTotal: number;
      quantity: number;
    }> = [];
    if (design.estimatedCost && design.estimatedCost > 0) {
      lineItems.push({
        description: design.name,
        printWeightG: design.targetWeightG ?? 0,
        printTimeMinutes: design.estimatedTimeMin ?? 0,
        materialCost: design.estimatedCost * 0.4,
        machineCost: design.estimatedCost * 0.3,
        labourCost: design.estimatedCost * 0.2,
        overheadCost: design.estimatedCost * 0.1,
        lineTotal: design.estimatedCost,
        quantity: 1,
      });
    }

    const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal * item.quantity, 0);
    const subtotalWithMarkup = Math.round(subtotal * (1 + markupPct / 100) * 100) / 100;
    const tax = Math.round(subtotalWithMarkup * taxPct / 100 * 100) / 100;
    const total = settings?.taxInclusive ? subtotalWithMarkup : Math.round((subtotalWithMarkup + tax) * 100) / 100;

    const quote = await prisma.$transaction(async (tx) => {
      const created = await tx.quote.create({
        data: {
          userId: user.id,
          quoteNumber,
          clientId: design.clientId,
          notes: descParts.join("\n"),
          markupPct,
          taxPct,
          taxLabel: settings?.taxLabel ?? "GST",
          taxInclusive: settings?.taxInclusive ?? false,
          subtotal,
          tax,
          total,
          lineItems: lineItems.length > 0 ? { create: lineItems } : undefined,
        },
        include: { lineItems: true },
      });

      await tx.quoteEvent.create({
        data: {
          quoteId: created.id,
          action: "created",
          detail: `Quote ${quoteNumber} created from design ${design.designNumber}`,
          actorId: user.id,
        },
      });

      // Link design to quote
      await tx.design.update({
        where: { id: design.id },
        data: { quoteId: created.id },
      });

      return created;
    });

    return NextResponse.json({ quoteId: quote.id, quoteNumber: quote.quoteNumber }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    console.error("Failed to create quote from design:", err);
    return NextResponse.json({ error: "Failed to create quote" }, { status: 500 });
  }
}
