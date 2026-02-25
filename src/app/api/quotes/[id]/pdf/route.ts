import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { QuoteDocument } from "@/lib/pdf/quote-document";
import React, { type ReactElement, type JSXElementConstructor } from "react";

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
        client: {
          select: {
            name: true,
            email: true,
            phone: true,
            company: true,
            billingAddress: true,
          },
        },
        lineItems: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const settings = await prisma.settings.findUnique({
      where: { userId: user.id },
      select: {
        businessName: true,
        businessAddress: true,
        businessAbn: true,
        businessPhone: true,
        businessEmail: true,
      },
    });

    const pdfData = {
      quoteNumber: quote.quoteNumber,
      createdAt: quote.createdAt.toISOString(),
      expiryDate: quote.expiryDate?.toISOString() || null,
      currency: quote.currency,
      subtotal: quote.subtotal,
      markupPct: quote.markupPct,
      total: quote.total,
      notes: quote.notes,
      terms: quote.terms,
      client: quote.client,
      lineItems: quote.lineItems.map((li) => ({
        description: li.description,
        materialCost: li.materialCost,
        machineCost: li.machineCost,
        labourCost: li.labourCost,
        overheadCost: li.overheadCost,
        lineTotal: li.lineTotal,
        quantity: li.quantity,
      })),
      business: {
        name: settings?.businessName || null,
        address: settings?.businessAddress || null,
        abn: settings?.businessAbn || null,
        phone: settings?.businessPhone || null,
        email: settings?.businessEmail || null,
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(
      React.createElement(QuoteDocument, { data: pdfData }) as any as ReactElement<DocumentProps, string | JSXElementConstructor<DocumentProps>>
    );

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${quote.quoteNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
