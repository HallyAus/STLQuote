import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";
import { getTaxDefaults, type TaxRegion } from "@/lib/tax-regions";
import React, { type ReactElement, type JSXElementConstructor } from "react";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireFeature("invoicing");

    const { id } = await context.params;

    const invoice = await prisma.invoice.findFirst({
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

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const settings = await prisma.settings.findUnique({
      where: { userId: user.id },
      select: {
        businessName: true,
        businessAddress: true,
        businessAbn: true,
        businessPhone: true,
        businessEmail: true,
        businessLogoUrl: true,
        bankName: true,
        bankBsb: true,
        bankAccountNumber: true,
        bankAccountName: true,
        taxRegion: true,
        taxLabel: true,
      },
    });

    const regionDefaults = getTaxDefaults((settings?.taxRegion || "AU") as TaxRegion);

    const pdfData = {
      invoiceNumber: invoice.invoiceNumber,
      createdAt: invoice.createdAt.toISOString(),
      dueDate: invoice.dueDate?.toISOString() || null,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      taxPct: invoice.taxPct,
      taxLabel: invoice.taxLabel || settings?.taxLabel || "GST",
      tax: invoice.tax,
      taxInclusive: invoice.taxInclusive || false,
      invoiceTitle: regionDefaults.invoiceTitle,
      taxIdLabel: regionDefaults.taxIdLabel,
      total: invoice.total,
      status: invoice.status,
      notes: invoice.notes,
      terms: invoice.terms,
      client: invoice.client,
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
      bank: settings?.bankName || settings?.bankBsb || settings?.bankAccountNumber || settings?.bankAccountName
        ? {
            name: settings.bankName ?? null,
            bsb: settings.bankBsb ?? null,
            accountNumber: settings.bankAccountNumber ?? null,
            accountName: settings.bankAccountName ?? null,
          }
        : null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(
      React.createElement(InvoiceDocument, { data: pdfData }) as any as ReactElement<DocumentProps, string | JSXElementConstructor<DocumentProps>>
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
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
