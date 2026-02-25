import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { fireWebhooks } from "@/lib/webhooks";

const updateQuoteSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]).optional(),
  clientId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  markupPct: z.number().min(0).optional(),
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

    const quote = await prisma.quote.findFirst({
      where: { id, userId: user.id },
      include: {
        client: true,
        lineItems: {
          include: {
            printer: { select: { name: true } },
            material: { select: { materialType: true, brand: true, colour: true } },
          },
        },
        jobs: {
          select: { id: true, status: true },
        },
      },
    });

    if (!quote) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error("Failed to fetch quote:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote" },
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
    const existing = await prisma.quote.findFirst({
      where: { id, userId: user.id },
      include: { lineItems: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateQuoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { ...parsed.data };

    // Convert expiryDate string to Date if provided
    if (parsed.data.expiryDate !== undefined) {
      updateData.expiryDate = parsed.data.expiryDate
        ? new Date(parsed.data.expiryDate)
        : null;
    }

    // Set sentAt when status changes to SENT
    if (parsed.data.status === "SENT" && existing.status !== "SENT") {
      updateData.sentAt = new Date();
    }

    // Recalculate total if markupPct changes
    if (parsed.data.markupPct !== undefined) {
      updateData.total = Math.round(
        existing.subtotal * (1 + parsed.data.markupPct / 100) * 100
      ) / 100;
    }

    const quote = await prisma.quote.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        lineItems: {
          include: {
            printer: { select: { name: true } },
            material: { select: { materialType: true, brand: true, colour: true } },
          },
        },
      },
    });

    // Log status change event
    if (parsed.data.status && parsed.data.status !== existing.status) {
      prisma.quoteEvent.create({
        data: {
          quoteId: id,
          action: "status_changed",
          detail: `Status changed from ${existing.status} to ${parsed.data.status}`,
          actorId: user.id,
        },
      }).catch((err) => console.error("Failed to log quote event:", err));
    }

    // Fire webhooks on status change
    if (parsed.data.status && parsed.data.status !== existing.status) {
      const eventMap: Record<string, string> = {
        ACCEPTED: "quote.accepted",
        REJECTED: "quote.rejected",
      };
      const event = eventMap[parsed.data.status] || "quote.updated";
      fireWebhooks(user.id, event, {
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        total: quote.total,
      });
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error("Failed to update quote:", error);
    return NextResponse.json(
      { error: "Failed to update quote" },
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
    const existing = await prisma.quote.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    await prisma.quote.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete quote:", error);
    return NextResponse.json(
      { error: "Failed to delete quote" },
      { status: 500 }
    );
  }
}
