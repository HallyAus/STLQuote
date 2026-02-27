import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { log } from "@/lib/logger";

const lineItemSchema = z.object({
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

const createQuoteSchema = z.object({
  clientId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  markupPct: z.number().min(0).default(0),
  taxPct: z.number().min(0).default(0),
  taxLabel: z.string().default("GST"),
  taxInclusive: z.boolean().default(false),
  lineItems: z.array(lineItemSchema).default([]),
});

async function generateQuoteNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PF-${year}-`;

  // Find the highest existing quote number for this user this year
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

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const quotes = await prisma.quote.findMany({
      where: { userId: user.id },
      include: {
        client: { select: { name: true } },
        lineItems: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json(quotes);
  } catch (error) {
    console.error("Failed to fetch quotes:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body = await request.json();
    const parsed = createQuoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { lineItems, ...quoteData } = parsed.data;

    const subtotal = Math.round(
      lineItems.reduce((sum, item) => sum + item.lineTotal * item.quantity, 0) * 100
    ) / 100;

    const subtotalWithMarkup = Math.round(
      subtotal * (1 + quoteData.markupPct / 100) * 100
    ) / 100;

    const tax = Math.round(subtotalWithMarkup * quoteData.taxPct / 100 * 100) / 100;

    const total = quoteData.taxInclusive
      ? subtotalWithMarkup
      : Math.round((subtotalWithMarkup + tax) * 100) / 100;

    const quoteNumber = await generateQuoteNumber(user.id);

    const quote = await prisma.$transaction(async (tx) => {
      const created = await tx.quote.create({
        data: {
          ...quoteData,
          expiryDate: quoteData.expiryDate
            ? new Date(quoteData.expiryDate)
            : null,
          userId: user.id,
          quoteNumber,
          subtotal,
          tax,
          total,
          lineItems: {
            create: lineItems,
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
          detail: `Quote ${quoteNumber} created${lineItems.length > 0 ? ` with ${lineItems.length} line item${lineItems.length !== 1 ? "s" : ""}` : ""}`,
          actorId: user.id,
        },
      });

      return created;
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error("Failed to create quote:", error);
    log({
      userId: (await getSessionUser().catch(() => null))?.id,
      type: "system",
      level: "error",
      message: "Failed to create quote",
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to create quote" },
      { status: 500 }
    );
  }
}
