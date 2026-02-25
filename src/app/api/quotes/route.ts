import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

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
  lineItems: z.array(lineItemSchema).default([]),
});

async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const startOfNextYear = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const count = await prisma.quote.count({
    where: {
      createdAt: {
        gte: startOfYear,
        lt: startOfNextYear,
      },
    },
  });

  const seq = String(count + 1).padStart(3, "0");
  return `PF-${year}-${seq}`;
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

    const total = Math.round(
      subtotal * (1 + quoteData.markupPct / 100) * 100
    ) / 100;

    const quoteNumber = await generateQuoteNumber();

    const quote = await prisma.$transaction(async (tx) => {
      return tx.quote.create({
        data: {
          ...quoteData,
          expiryDate: quoteData.expiryDate
            ? new Date(quoteData.expiryDate)
            : null,
          userId: user.id,
          quoteNumber,
          subtotal,
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
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error("Failed to create quote:", error);
    return NextResponse.json(
      { error: "Failed to create quote" },
      { status: 500 }
    );
  }
}
