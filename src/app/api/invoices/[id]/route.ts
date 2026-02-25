import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { roundCurrency } from "@/lib/utils";

const updateInvoiceSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"]).optional(),
  clientId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  taxPct: z.number().min(0).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  paidAt: z.string().datetime().optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await context.params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: user.id },
      include: {
        client: true,
        lineItems: true,
        quote: { select: { id: true, quoteNumber: true } },
        job: { select: { id: true, status: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Failed to fetch invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await context.params;

    // Verify ownership
    const existing = await prisma.invoice.findFirst({
      where: { id, userId: user.id },
      include: { lineItems: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateInvoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { ...parsed.data };

    // Convert dueDate string to Date if provided
    if (parsed.data.dueDate !== undefined) {
      updateData.dueDate = parsed.data.dueDate
        ? new Date(parsed.data.dueDate)
        : null;
    }

    // Convert paidAt string to Date if provided
    if (parsed.data.paidAt !== undefined) {
      updateData.paidAt = parsed.data.paidAt
        ? new Date(parsed.data.paidAt)
        : null;
    }

    // Set sentAt when status changes to SENT
    if (parsed.data.status === "SENT" && existing.status !== "SENT") {
      updateData.sentAt = new Date();
    }

    // Set paidAt when status changes to PAID
    if (parsed.data.status === "PAID" && existing.status !== "PAID") {
      updateData.paidAt = new Date();
    }

    // Recalculate totals if taxPct changes
    if (parsed.data.taxPct !== undefined) {
      const tax = roundCurrency(existing.subtotal * parsed.data.taxPct / 100);
      updateData.tax = tax;
      updateData.total = roundCurrency(existing.subtotal + tax);
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        lineItems: true,
        quote: { select: { id: true, quoteNumber: true } },
        job: { select: { id: true, status: true } },
      },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Failed to update invoice:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
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

    const { id } = await context.params;

    // Verify ownership
    const existing = await prisma.invoice.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    await prisma.invoice.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete invoice:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
