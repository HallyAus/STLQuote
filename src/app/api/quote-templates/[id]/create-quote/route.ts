import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

const createFromTemplateSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
});

async function generateQuoteNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PF-${year}-`;

  const latest = await prisma.quote.findFirst({
    where: {
      userId,
      quoteNumber: { startsWith: prefix },
    },
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await params;

    const template = await prisma.quoteTemplate.findFirst({
      where: { id, userId: user.id },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createFromTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Parse line items from template
    let lineItems: Array<{
      description: string;
      printWeightG?: number;
      printTimeMinutes?: number;
      materialCost?: number;
      machineCost?: number;
      labourCost?: number;
      overheadCost?: number;
      lineTotal?: number;
      quantity?: number;
      notes?: string | null;
    }> = [];

    if (template.lineItems) {
      try {
        lineItems = JSON.parse(template.lineItems);
      } catch {
        // Ignore parse errors
      }
    }

    const subtotal = lineItems.reduce(
      (sum, item) => sum + (item.lineTotal ?? 0) * (item.quantity ?? 1),
      0
    );
    const total = Math.round(subtotal * (1 + (template.markupPct || 0) / 100) * 100) / 100;

    const quoteNumber = await generateQuoteNumber(user.id);

    const quote = await prisma.$transaction(async (tx) => {
      const created = await tx.quote.create({
        data: {
          userId: user.id,
          clientId: parsed.data.clientId,
          quoteNumber,
          markupPct: template.markupPct,
          subtotal: Math.round(subtotal * 100) / 100,
          total,
          notes: template.notes,
          terms: template.terms,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lineItems: {
            create: lineItems.map((item) => ({
              description: item.description,
              printWeightG: item.printWeightG ?? 0,
              printTimeMinutes: item.printTimeMinutes ?? 0,
              materialCost: item.materialCost ?? 0,
              machineCost: item.machineCost ?? 0,
              labourCost: item.labourCost ?? 0,
              overheadCost: item.overheadCost ?? 0,
              lineTotal: item.lineTotal ?? 0,
              quantity: item.quantity ?? 1,
              notes: item.notes ?? null,
            })),
          },
        },
        include: {
          client: { select: { name: true } },
          lineItems: true,
        },
      });

      await tx.quoteEvent.create({
        data: {
          quoteId: created.id,
          action: "created",
          detail: `Quote ${quoteNumber} created from template "${template.name}"`,
          actorId: user.id,
        },
      });

      return created;
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error("Failed to create quote from template:", error);
    return NextResponse.json({ error: "Failed to create quote from template" }, { status: 500 });
  }
}
