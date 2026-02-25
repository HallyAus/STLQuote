import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { sendEmail } from "@/lib/email";
import { generateToken } from "@/lib/tokens";
import { rateLimit } from "@/lib/rate-limit";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";
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

    // Rate limit: 3 sends per hour per invoice per user
    const rlResult = rateLimit(`send-invoice:${user.id}:${id}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 3,
    });
    if (rlResult.limited) {
      return NextResponse.json(
        { error: `Too many sends. Try again in ${Math.ceil(rlResult.retryAfterSeconds / 60)} minutes.` },
        { status: 429 }
      );
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: user.id },
      include: {
        client: true,
        lineItems: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (!invoice.client?.email) {
      return NextResponse.json(
        { error: "Client has no email address. Add one before sending." },
        { status: 400 }
      );
    }

    // Generate portal token if not already set
    let portalToken = invoice.portalToken;
    if (!portalToken) {
      portalToken = generateToken();
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const portalUrl = `${appUrl}/portal/invoice/${portalToken}`;

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

    const businessName = settings?.businessName || "Printforge";

    // Generate PDF attachment
    let pdfBuffer: Buffer | undefined;
    try {
      const pdfData = {
        invoiceNumber: invoice.invoiceNumber,
        createdAt: invoice.createdAt.toISOString(),
        dueDate: invoice.dueDate?.toISOString() || null,
        currency: invoice.currency,
        subtotal: invoice.subtotal,
        taxPct: invoice.taxPct,
        tax: invoice.tax,
        total: invoice.total,
        status: invoice.status,
        notes: invoice.notes,
        terms: invoice.terms,
        client: invoice.client
          ? {
              name: invoice.client.name,
              email: invoice.client.email,
              phone: invoice.client.phone,
              company: invoice.client.company,
              billingAddress: invoice.client.billingAddress,
            }
          : null,
        lineItems: invoice.lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          lineTotal: li.lineTotal,
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
        React.createElement(InvoiceDocument, { data: pdfData }) as any as ReactElement<DocumentProps, string | JSXElementConstructor<DocumentProps>>
      );
      pdfBuffer = Buffer.from(buffer);
    } catch (pdfError) {
      console.error("Failed to generate PDF for email:", pdfError);
      // Continue without attachment
    }

    const attachments = pdfBuffer
      ? [{ filename: `${invoice.invoiceNumber}.pdf`, content: pdfBuffer, contentType: "application/pdf" }]
      : undefined;

    // Send email with PDF attachment
    const sent = await sendEmail({
      to: invoice.client.email,
      subject: `Invoice ${invoice.invoiceNumber} from ${businessName}`,
      type: "invoice",
      userId: user.id,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #171717;">Invoice ${invoice.invoiceNumber}</h2>
          <p>You've received an invoice from <strong>${businessName}</strong>.</p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">Total Due</p>
            <p style="margin: 4px 0 0; font-size: 24px; font-weight: bold; color: #171717;">
              $${invoice.total.toFixed(2)} ${invoice.currency}
            </p>
            ${invoice.dueDate ? `<p style="margin: 8px 0 0; font-size: 13px; color: #666;">Due by ${new Date(invoice.dueDate).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}</p>` : ""}
          </div>
          <p>View this invoice online:</p>
          <p style="margin: 24px 0;">
            <a href="${portalUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              View Invoice
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">${businessName} — Powered by Printforge</p>
        </div>
      `,
      attachments,
    });

    // Update invoice: set portal token, status to SENT, sentAt
    await prisma.invoice.update({
      where: { id },
      data: {
        portalToken,
        status: "SENT",
        sentAt: new Date(),
      },
    });

    return NextResponse.json({
      message: sent ? "Invoice sent successfully." : "Invoice marked as sent (email not configured).",
      portalUrl,
    });
  } catch (error) {
    console.error("Failed to send invoice:", error);
    return NextResponse.json(
      { error: "Failed to send invoice" },
      { status: 500 }
    );
  }
}
