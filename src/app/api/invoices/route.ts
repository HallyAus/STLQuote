import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireFeature } from "@/lib/auth-helpers";
import { roundCurrency } from "@/lib/utils";

const invoiceLineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0).default(0),
  lineTotal: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

const createInvoiceSchema = z.object({
  quoteId: z.string().optional().nullable(),
  jobId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  taxPct: z.number().min(0).default(10),
  dueDate: z.string().datetime().optional().nullable(),
  currency: z.string().default("AUD"),
  lineItems: z.array(invoiceLineItemSchema).default([]),
});

async function generateInvoiceNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // Find the highest existing invoice number for this user this year
  const latest = await prisma.invoice.findFirst({
    where: {
      userId,
      invoiceNumber: { startsWith: prefix },
    },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });

  let nextSeq = 1;
  if (latest?.invoiceNumber) {
    const seqStr = latest.invoiceNumber.replace(prefix, "");
    const lastSeq = parseInt(seqStr, 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
}

export async function GET() {
  try {
    const user = await requireFeature("invoicing");

    const invoices = await prisma.invoice.findMany({
      where: { userId: user.id },
      include: {
        client: { select: { name: true } },
        lineItems: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireFeature("invoicing");

    const body = await request.json();
    const parsed = createInvoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let { lineItems, ...invoiceData } = parsed.data;

    // If quoteId is provided, pre-fill line items from the quote
    if (invoiceData.quoteId) {
      const quote = await prisma.quote.findFirst({
        where: { id: invoiceData.quoteId, userId: user.id },
        include: { lineItems: true },
      });

      if (!quote) {
        return NextResponse.json(
          { error: "Quote not found" },
          { status: 404 }
        );
      }

      // Use quote line items if none were provided
      if (lineItems.length === 0) {
        lineItems = quote.lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.lineTotal,
          lineTotal: roundCurrency(li.lineTotal * li.quantity),
          notes: li.notes,
        }));
      }

      // Use quote client if not explicitly set
      if (!invoiceData.clientId && quote.clientId) {
        invoiceData.clientId = quote.clientId;
      }
    }

    // If jobId is provided (and no quoteId), pre-fill from job data
    if (invoiceData.jobId && !invoiceData.quoteId) {
      const job = await prisma.job.findFirst({
        where: { id: invoiceData.jobId, userId: user.id },
        select: { clientId: true, price: true, notes: true, quoteId: true },
      });

      if (job) {
        // Use job's quote if available
        if (job.quoteId) {
          invoiceData.quoteId = job.quoteId;
        }
        // Use job client if not explicitly set
        if (!invoiceData.clientId && job.clientId) {
          invoiceData.clientId = job.clientId;
        }
        // Create line item from job price if no line items and no quote
        if (lineItems.length === 0 && !job.quoteId && job.price) {
          const desc = job.notes?.split("\n")[0] || "Job";
          lineItems = [{
            description: desc,
            quantity: 1,
            unitPrice: job.price,
            lineTotal: job.price,
            notes: null,
          }];
        }
      }
    }

    // Auto-calculate due date from client's payment terms if not explicitly provided
    if (!invoiceData.dueDate && invoiceData.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: invoiceData.clientId, userId: user.id },
        select: { paymentTermsDays: true },
      });
      if (client) {
        const due = new Date();
        due.setDate(due.getDate() + client.paymentTermsDays);
        invoiceData.dueDate = due.toISOString();
      }
    }

    const subtotal = roundCurrency(
      lineItems.reduce((sum, item) => sum + item.lineTotal, 0)
    );
    const tax = roundCurrency(subtotal * invoiceData.taxPct / 100);
    const total = roundCurrency(subtotal + tax);

    const invoiceNumber = await generateInvoiceNumber(user.id);

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          ...invoiceData,
          dueDate: invoiceData.dueDate
            ? new Date(invoiceData.dueDate)
            : null,
          userId: user.id,
          invoiceNumber,
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

      return created;
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Failed to create invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
