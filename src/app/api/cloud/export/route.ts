import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import * as googleDrive from "@/lib/google-drive";
import * as oneDrive from "@/lib/onedrive";
import path from "path";
import fs from "fs/promises";
import React, { type ReactElement, type JSXElementConstructor } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { QuoteDocument } from "@/lib/pdf/quote-document";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";
import { getTaxDefaults, type TaxRegion } from "@/lib/tax-regions";

export async function POST(request: NextRequest) {
  try {
    const user = await requireFeature("cloud_storage");
    const body = await request.json();
    const { provider, fileType, fileId } = body;

    if (!provider || !["google_drive", "onedrive"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    if (!fileType || !fileId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get the cloud connection
    const connection = await prisma.cloudConnection.findUnique({
      where: { userId_provider: { userId: user.id, provider } },
    });
    if (!connection) {
      return NextResponse.json({ error: `${provider === "google_drive" ? "Google Drive" : "OneDrive"} not connected` }, { status: 400 });
    }

    let fileBuffer: Buffer;
    let fileName: string;
    let mimeType: string;
    let targetFolder: string;

    if (fileType === "design_file") {
      // Export a design file
      const designFile = await prisma.designFile.findUnique({
        where: { id: fileId },
        include: { design: { select: { userId: true, designNumber: true } } },
      });
      if (!designFile || designFile.design.userId !== user.id) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      const filePath = path.join(process.cwd(), "uploads", "designs", user.id, designFile.designId, designFile.filename);
      fileBuffer = await fs.readFile(filePath);
      fileName = designFile.originalName;
      mimeType = designFile.mimeType;
      targetFolder = `Designs/${designFile.design.designNumber}`;

    } else if (fileType === "quote_pdf") {
      // Generate quote PDF server-side
      const quote = await prisma.quote.findFirst({
        where: { id: fileId, userId: user.id },
        include: {
          client: { select: { name: true, email: true, phone: true, company: true, billingAddress: true } },
          lineItems: true,
        },
      });
      if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

      const settings = await prisma.settings.findUnique({
        where: { userId: user.id },
        select: { businessName: true, businessAddress: true, businessAbn: true, businessPhone: true, businessEmail: true, businessLogoUrl: true, taxRegion: true, taxLabel: true },
      });
      const regionDefaults = getTaxDefaults((settings?.taxRegion || "AU") as TaxRegion);

      const pdfData = {
        quoteNumber: quote.quoteNumber, createdAt: quote.createdAt.toISOString(),
        expiryDate: quote.expiryDate?.toISOString() || null, currency: quote.currency,
        subtotal: quote.subtotal, markupPct: quote.markupPct,
        taxPct: quote.taxPct || 0, taxLabel: quote.taxLabel || settings?.taxLabel || "GST",
        tax: quote.tax || 0, taxInclusive: quote.taxInclusive || false,
        taxIdLabel: regionDefaults.taxIdLabel, total: quote.total,
        notes: quote.notes, terms: quote.terms, client: quote.client,
        lineItems: quote.lineItems.map((li) => ({
          description: li.description, materialCost: li.materialCost, machineCost: li.machineCost,
          labourCost: li.labourCost, overheadCost: li.overheadCost, lineTotal: li.lineTotal, quantity: li.quantity,
        })),
        business: {
          name: settings?.businessName || null, address: settings?.businessAddress || null,
          abn: settings?.businessAbn || null, phone: settings?.businessPhone || null,
          email: settings?.businessEmail || null, logoUrl: settings?.businessLogoUrl || null,
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buffer = await renderToBuffer(
        React.createElement(QuoteDocument, { data: pdfData }) as any as ReactElement<DocumentProps, string | JSXElementConstructor<DocumentProps>>
      );
      fileBuffer = Buffer.from(buffer);
      fileName = `${quote.quoteNumber}.pdf`;
      mimeType = "application/pdf";
      targetFolder = "Quotes";

    } else if (fileType === "invoice_pdf") {
      // Generate invoice PDF server-side
      const invoice = await prisma.invoice.findFirst({
        where: { id: fileId, userId: user.id },
        include: {
          client: { select: { name: true, email: true, phone: true, company: true, billingAddress: true } },
          lineItems: true,
        },
      });
      if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

      const settings = await prisma.settings.findUnique({
        where: { userId: user.id },
        select: { businessName: true, businessAddress: true, businessAbn: true, businessPhone: true, businessEmail: true, businessLogoUrl: true, bankName: true, bankBsb: true, bankAccountNumber: true, bankAccountName: true, taxRegion: true, taxLabel: true },
      });
      const regionDefaults = getTaxDefaults((settings?.taxRegion || "AU") as TaxRegion);

      const pdfData = {
        invoiceNumber: invoice.invoiceNumber, createdAt: invoice.createdAt.toISOString(),
        dueDate: invoice.dueDate?.toISOString() || null, currency: invoice.currency,
        subtotal: invoice.subtotal, taxPct: invoice.taxPct,
        taxLabel: invoice.taxLabel || settings?.taxLabel || "GST", tax: invoice.tax,
        taxInclusive: invoice.taxInclusive || false,
        invoiceTitle: regionDefaults.invoiceTitle, taxIdLabel: regionDefaults.taxIdLabel,
        total: invoice.total, status: invoice.status,
        notes: invoice.notes, terms: invoice.terms, client: invoice.client,
        lineItems: invoice.lineItems.map((li) => ({
          description: li.description, quantity: li.quantity, unitPrice: li.unitPrice, lineTotal: li.lineTotal,
        })),
        business: {
          name: settings?.businessName || null, address: settings?.businessAddress || null,
          abn: settings?.businessAbn || null, phone: settings?.businessPhone || null,
          email: settings?.businessEmail || null, logoUrl: settings?.businessLogoUrl || null,
        },
        bank: settings?.bankName || settings?.bankBsb || settings?.bankAccountNumber || settings?.bankAccountName
          ? { name: settings.bankName ?? null, bsb: settings.bankBsb ?? null, accountNumber: settings.bankAccountNumber ?? null, accountName: settings.bankAccountName ?? null }
          : null,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buffer = await renderToBuffer(
        React.createElement(InvoiceDocument, { data: pdfData }) as any as ReactElement<DocumentProps, string | JSXElementConstructor<DocumentProps>>
      );
      fileBuffer = Buffer.from(buffer);
      fileName = `${invoice.invoiceNumber}.pdf`;
      mimeType = "application/pdf";
      targetFolder = "Invoices";

    } else {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // Get access token
    let cloudFileResult: { id: string; name: string };

    if (provider === "google_drive") {
      const accessToken = await googleDrive.getAccessToken(user.id);

      // Find or create target folder under root
      let targetFolderId = connection.rootFolderId;
      if (targetFolderId) {
        // Navigate to sub-folder
        for (const segment of targetFolder.split("/")) {
          const existing = await googleDrive.listFiles(accessToken, targetFolderId!);
          const folder = existing.files.find(
            (f) => f.name === segment && f.mimeType === "application/vnd.google-apps.folder"
          );
          if (folder) {
            targetFolderId = folder.id;
          } else {
            targetFolderId = await googleDrive.createFolder(accessToken, segment, targetFolderId!);
          }
        }
      }

      const result = await googleDrive.uploadFile(accessToken, fileName, mimeType, fileBuffer, targetFolderId || undefined);
      cloudFileResult = { id: result.id, name: result.name };

    } else {
      const accessToken = await oneDrive.getAccessToken(user.id);

      let targetFolderId = connection.rootFolderId;
      if (targetFolderId) {
        for (const segment of targetFolder.split("/")) {
          const existing = await oneDrive.listFiles(accessToken, targetFolderId!);
          const folder = existing.items.find((item) => item.name === segment && !!item.folder);
          if (folder) {
            targetFolderId = folder.id;
          } else {
            targetFolderId = await oneDrive.createFolder(accessToken, segment, targetFolderId!);
          }
        }
      }

      const result = await oneDrive.uploadFile(accessToken, fileName, mimeType, fileBuffer, targetFolderId || undefined);
      cloudFileResult = { id: result.id, name: result.name };
    }

    // Create sync record
    await prisma.cloudSyncRecord.upsert({
      where: {
        connectionId_localFileType_localFileId: {
          connectionId: connection.id,
          localFileType: fileType,
          localFileId: fileId,
        },
      },
      create: {
        connectionId: connection.id,
        localFileType: fileType,
        localFileId: fileId,
        cloudFileId: cloudFileResult.id,
        cloudFileName: cloudFileResult.name,
        cloudFolderPath: targetFolder,
        direction: "upload",
        localModifiedAt: new Date(),
        cloudModifiedAt: new Date(),
        syncStatus: "synced",
      },
      update: {
        cloudFileId: cloudFileResult.id,
        cloudFileName: cloudFileResult.name,
        cloudModifiedAt: new Date(),
        syncStatus: "synced",
        errorMessage: null,
      },
    });

    // Update last sync time
    await prisma.cloudConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      cloudFileId: cloudFileResult.id,
      cloudFileName: cloudFileResult.name,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Cloud export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export file" },
      { status: 500 }
    );
  }
}
