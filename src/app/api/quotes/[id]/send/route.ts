import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { sendQuoteEmail } from "@/lib/email";
import { generateToken } from "@/lib/tokens";
import { rateLimit } from "@/lib/rate-limit";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { QuoteDocument } from "@/lib/pdf/quote-document";
import React, { type ReactElement, type JSXElementConstructor } from "react";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await context.params;

    // Rate limit: 3 sends per hour per quote per user
    const rlResult = rateLimit(`send-quote:${user.id}:${id}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 3,
    });
    if (rlResult.limited) {
      return NextResponse.json(
        { error: `Too many sends. Try again in ${Math.ceil(rlResult.retryAfterSeconds / 60)} minutes.` },
        { status: 429 }
      );
    }

    const quote = await prisma.quote.findFirst({
      where: { id, userId: user.id },
      include: {
        client: true,
        lineItems: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (!quote.client?.email) {
      return NextResponse.json(
        { error: "Client has no email address. Add one before sending." },
        { status: 400 }
      );
    }

    // Generate portal token if not already set
    let portalToken = quote.portalToken;
    if (!portalToken) {
      portalToken = generateToken();
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const portalUrl = `${appUrl}/portal/${portalToken}`;

    // Fetch business settings
    const settings = await prisma.settings.findUnique({
      where: { userId: user.id },
      select: {
        businessName: true,
        businessAddress: true,
        businessAbn: true,
        businessPhone: true,
        businessEmail: true,
        businessLogoUrl: true,
      },
    });

    // Generate PDF attachment
    let pdfBuffer: Buffer | undefined;
    try {
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
        client: quote.client
          ? {
              name: quote.client.name,
              email: quote.client.email,
              phone: quote.client.phone,
              company: quote.client.company,
              billingAddress: quote.client.billingAddress,
            }
          : null,
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
          logoUrl: settings?.businessLogoUrl || null,
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buffer = await renderToBuffer(
        React.createElement(QuoteDocument, { data: pdfData }) as any as ReactElement<DocumentProps, string | JSXElementConstructor<DocumentProps>>
      );
      pdfBuffer = Buffer.from(buffer);
    } catch (pdfError) {
      console.error("Failed to generate PDF for email:", pdfError);
      // Continue without attachment
    }

    // Send email with PDF attachment
    const sent = await sendQuoteEmail({
      to: quote.client.email,
      quoteNumber: quote.quoteNumber,
      total: quote.total,
      currency: quote.currency,
      portalUrl,
      businessName: settings?.businessName || undefined,
      pdfBuffer,
      userId: user.id,
    });

    // Update quote: set portal token, status to SENT, sentAt
    await prisma.quote.update({
      where: { id },
      data: {
        portalToken,
        status: "SENT",
        sentAt: new Date(),
      },
    });

    // Log emailed event
    prisma.quoteEvent.create({
      data: {
        quoteId: id,
        action: "emailed",
        detail: `Emailed to ${quote.client.email}${sent ? "" : " (email not configured)"}`,
        actorId: user.id,
      },
    }).catch((err) => console.error("Failed to log quote event:", err));

    return NextResponse.json({
      message: sent ? "Quote sent successfully." : "Quote marked as sent (email not configured).",
      portalUrl,
    });
  } catch (error) {
    console.error("Failed to send quote:", error);
    return NextResponse.json(
      { error: "Failed to send quote" },
      { status: 500 }
    );
  }
}
