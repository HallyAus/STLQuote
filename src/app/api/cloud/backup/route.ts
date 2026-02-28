import { NextRequest } from "next/server";
import { requireFeature } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import * as oneDrive from "@/lib/onedrive";
import { getTaxDefaults, type TaxRegion } from "@/lib/tax-regions";
import React, { type ReactElement, type JSXElementConstructor } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { QuoteDocument } from "@/lib/pdf/quote-document";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";
import path from "path";
import fs from "fs/promises";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BackupEvent {
  type: "progress" | "error" | "complete";
  phase?: string;
  item?: string;
  current?: number;
  total?: number;
  message?: string;
  stats?: BackupStats;
}

interface BackupStats {
  dataFiles: number;
  quotePdfs: number;
  invoicePdfs: number;
  designFiles: number;
  jobPhotos: number;
  errors: number;
  startedAt: string;
  completedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sseEncode(event: BackupEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** Create a folder within a parent, finding existing by name first. */
async function ensureFolder(
  accessToken: string,
  name: string,
  parentId: string
): Promise<string> {
  const existing = await oneDrive.listFiles(accessToken, parentId);
  const found = existing.items.find((item) => item.name === name && !!item.folder);
  if (found) return found.id;
  return oneDrive.createFolder(accessToken, name, parentId);
}

// ---------------------------------------------------------------------------
// POST /api/cloud/backup — SSE streaming master backup to OneDrive
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const user = await requireFeature("cloud_storage");

    // Rate limit: 1 backup per hour per user
    const rl = rateLimit(`backup:${user.id}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 1,
    });
    if (rl.limited) {
      return new Response(
        JSON.stringify({ error: `Backup rate limited. Try again in ${rl.retryAfterSeconds}s.` }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify OneDrive is connected
    const connection = await prisma.cloudConnection.findUnique({
      where: { userId_provider: { userId: user.id, provider: "onedrive" } },
    });
    if (!connection) {
      return new Response(
        JSON.stringify({ error: "OneDrive not connected" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Stream SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const errors: Array<{ phase: string; item: string; error: string }> = [];
        const startedAt = new Date().toISOString();
        const stats: BackupStats = {
          dataFiles: 0, quotePdfs: 0, invoicePdfs: 0,
          designFiles: 0, jobPhotos: 0, errors: 0,
          startedAt, completedAt: "",
        };

        function send(event: BackupEvent) {
          try {
            controller.enqueue(encoder.encode(sseEncode(event)));
          } catch {
            // Stream may have been closed by client
          }
        }

        function sendProgress(phase: string, item: string, current: number, total: number) {
          send({ type: "progress", phase, item, current, total });
        }

        function sendError(phase: string, item: string, error: string) {
          errors.push({ phase, item, error });
          stats.errors++;
          send({ type: "error", phase, item, message: error });
        }

        try {
          // Get fresh access token
          let accessToken = await oneDrive.getAccessToken(user.id);

          // Ensure root folder exists
          let rootId = connection.rootFolderId;
          if (!rootId) {
            rootId = await oneDrive.createFolder(accessToken, "Printforge CRM");
            await prisma.cloudConnection.update({
              where: { id: connection.id },
              data: { rootFolderId: rootId },
            });
          }

          // Create backup timestamp folder
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
          const backupsId = await ensureFolder(accessToken, "Backups", rootId);
          const backupRootId = await oneDrive.createFolder(accessToken, timestamp, backupsId);

          // ---------------------------------------------------------------
          // Phase 1: JSON data export
          // ---------------------------------------------------------------
          sendProgress("data", "Starting data export...", 0, 17);
          const dataFolderId = await oneDrive.createFolder(accessToken, "Data", backupRootId);

          const dataExports: Array<{ name: string; query: () => Promise<unknown> }> = [
            { name: "settings.json", query: () => prisma.settings.findMany({ where: { userId: user.id } }) },
            { name: "printers.json", query: () => prisma.printer.findMany({ where: { userId: user.id } }) },
            { name: "materials.json", query: () => prisma.material.findMany({ where: { userId: user.id } }) },
            { name: "clients.json", query: () => prisma.client.findMany({ where: { userId: user.id }, include: { interactions: true } }) },
            { name: "quotes.json", query: () => prisma.quote.findMany({ where: { userId: user.id }, include: { lineItems: true, events: true } }) },
            { name: "invoices.json", query: () => prisma.invoice.findMany({ where: { userId: user.id }, include: { lineItems: true } }) },
            { name: "jobs.json", query: () => prisma.job.findMany({ where: { userId: user.id }, include: { events: true } }) },
            { name: "designs.json", query: () => prisma.design.findMany({ where: { userId: user.id }, include: { files: true, revisions: true } }) },
            { name: "suppliers.json", query: () => prisma.supplier.findMany({ where: { userId: user.id }, include: { items: true } }) },
            { name: "consumables.json", query: () => prisma.consumable.findMany({ where: { userId: user.id } }) },
            { name: "stock-transactions.json", query: () => prisma.stockTransaction.findMany({ where: { userId: user.id } }) },
            { name: "purchase-orders.json", query: () => prisma.purchaseOrder.findMany({ where: { userId: user.id }, include: { items: true } }) },
            { name: "calculator-presets.json", query: () => prisma.calculatorPreset.findMany({ where: { userId: user.id } }) },
            { name: "webhooks.json", query: async () => {
              const hooks = await prisma.webhook.findMany({ where: { userId: user.id } });
              return hooks.map((h) => ({ ...h, secret: "***REDACTED***" }));
            }},
            { name: "drawings.json", query: () => prisma.partDrawing.findMany({ where: { userId: user.id } }) },
            { name: "quote-templates.json", query: () => prisma.quoteTemplate.findMany({ where: { userId: user.id } }) },
            { name: "upload-links.json", query: () => prisma.uploadLink.findMany({ where: { userId: user.id }, include: { quoteRequests: true } }) },
          ];

          for (let i = 0; i < dataExports.length; i++) {
            const { name, query } = dataExports[i];
            try {
              sendProgress("data", name, i + 1, dataExports.length);
              const data = await query();
              const json = JSON.stringify(data, null, 2);
              const buf = Buffer.from(json, "utf-8");
              await oneDrive.uploadFile(accessToken, name, "application/json", buf, dataFolderId);
              stats.dataFiles++;
            } catch (err) {
              sendError("data", name, err instanceof Error ? err.message : "Unknown error");
            }
          }

          // ---------------------------------------------------------------
          // Phase 2: Quote PDFs
          // ---------------------------------------------------------------
          accessToken = await oneDrive.getAccessToken(user.id); // refresh token

          const quotes = await prisma.quote.findMany({
            where: { userId: user.id },
            include: {
              client: { select: { name: true, email: true, phone: true, company: true, billingAddress: true } },
              lineItems: true,
            },
          });

          if (quotes.length > 0) {
            const quotesFolderId = await oneDrive.createFolder(accessToken, "Quotes", backupRootId);
            const settings = await prisma.settings.findUnique({
              where: { userId: user.id },
              select: { businessName: true, businessAddress: true, businessAbn: true, businessPhone: true, businessEmail: true, businessLogoUrl: true, taxRegion: true, taxLabel: true },
            });
            const regionDefaults = getTaxDefaults((settings?.taxRegion || "AU") as TaxRegion);

            sendProgress("quotes", "Generating quote PDFs...", 0, quotes.length);

            for (let i = 0; i < quotes.length; i++) {
              const quote = quotes[i];
              try {
                sendProgress("quotes", `${quote.quoteNumber}.pdf`, i + 1, quotes.length);

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
                const pdfBuf = Buffer.from(buffer);
                await oneDrive.uploadFileAuto(accessToken, `${quote.quoteNumber}.pdf`, "application/pdf", pdfBuf, quotesFolderId);
                stats.quotePdfs++;
              } catch (err) {
                sendError("quotes", quote.quoteNumber, err instanceof Error ? err.message : "Unknown error");
              }
            }
          }

          // ---------------------------------------------------------------
          // Phase 3: Invoice PDFs
          // ---------------------------------------------------------------
          accessToken = await oneDrive.getAccessToken(user.id);

          const invoices = await prisma.invoice.findMany({
            where: { userId: user.id },
            include: {
              client: { select: { name: true, email: true, phone: true, company: true, billingAddress: true } },
              lineItems: true,
            },
          });

          if (invoices.length > 0) {
            const invoicesFolderId = await oneDrive.createFolder(accessToken, "Invoices", backupRootId);
            const settings = await prisma.settings.findUnique({
              where: { userId: user.id },
              select: { businessName: true, businessAddress: true, businessAbn: true, businessPhone: true, businessEmail: true, businessLogoUrl: true, bankName: true, bankBsb: true, bankAccountNumber: true, bankAccountName: true, taxRegion: true, taxLabel: true },
            });
            const regionDefaults = getTaxDefaults((settings?.taxRegion || "AU") as TaxRegion);

            sendProgress("invoices", "Generating invoice PDFs...", 0, invoices.length);

            for (let i = 0; i < invoices.length; i++) {
              const invoice = invoices[i];
              try {
                sendProgress("invoices", `${invoice.invoiceNumber}.pdf`, i + 1, invoices.length);

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
                const pdfBuf = Buffer.from(buffer);
                await oneDrive.uploadFileAuto(accessToken, `${invoice.invoiceNumber}.pdf`, "application/pdf", pdfBuf, invoicesFolderId);
                stats.invoicePdfs++;
              } catch (err) {
                sendError("invoices", invoice.invoiceNumber, err instanceof Error ? err.message : "Unknown error");
              }
            }
          }

          // ---------------------------------------------------------------
          // Phase 4: Design files from disk
          // ---------------------------------------------------------------
          accessToken = await oneDrive.getAccessToken(user.id);

          const designs = await prisma.design.findMany({
            where: { userId: user.id },
            include: { files: true },
            orderBy: { designNumber: "asc" },
          });

          const allDesignFiles = designs.flatMap((d) =>
            d.files.map((f) => ({ designNumber: d.designNumber, designId: d.id, file: f }))
          );

          if (allDesignFiles.length > 0) {
            const designsFolderId = await oneDrive.createFolder(accessToken, "Design Files", backupRootId);
            const designFolderCache = new Map<string, string>();

            sendProgress("designs", "Uploading design files...", 0, allDesignFiles.length);

            for (let i = 0; i < allDesignFiles.length; i++) {
              const { designNumber, designId, file } = allDesignFiles[i];
              try {
                sendProgress("designs", `${designNumber}/${file.originalName}`, i + 1, allDesignFiles.length);

                // Ensure per-design subfolder
                let designFolderId = designFolderCache.get(designNumber);
                if (!designFolderId) {
                  designFolderId = await ensureFolder(accessToken, designNumber, designsFolderId);
                  designFolderCache.set(designNumber, designFolderId);
                }

                const filePath = path.join(process.cwd(), "uploads", "designs", user.id, designId, file.filename);
                const fileBuffer = await fs.readFile(filePath);
                await oneDrive.uploadFileAuto(accessToken, file.originalName, file.mimeType, fileBuffer, designFolderId);
                stats.designFiles++;
              } catch (err) {
                sendError("designs", `${designNumber}/${file.originalName}`, err instanceof Error ? err.message : "Unknown error");
              }
            }
          }

          // ---------------------------------------------------------------
          // Phase 5: Job photos from disk
          // ---------------------------------------------------------------
          accessToken = await oneDrive.getAccessToken(user.id);

          const jobPhotos = await prisma.jobPhoto.findMany({
            where: { userId: user.id },
          });

          if (jobPhotos.length > 0) {
            const photosFolderId = await oneDrive.createFolder(accessToken, "Job Photos", backupRootId);
            const jobFolderCache = new Map<string, string>();

            sendProgress("photos", "Uploading job photos...", 0, jobPhotos.length);

            for (let i = 0; i < jobPhotos.length; i++) {
              const photo = jobPhotos[i];
              try {
                sendProgress("photos", photo.filename, i + 1, jobPhotos.length);

                let jobFolderId = jobFolderCache.get(photo.jobId);
                if (!jobFolderId) {
                  jobFolderId = await ensureFolder(accessToken, photo.jobId, photosFolderId);
                  jobFolderCache.set(photo.jobId, jobFolderId);
                }

                const filePath = path.join(process.cwd(), "uploads", "photos", user.id, photo.jobId, photo.filename);
                const fileBuffer = await fs.readFile(filePath);
                await oneDrive.uploadFileAuto(accessToken, photo.filename, photo.mimeType || "image/jpeg", fileBuffer, jobFolderId);
                stats.jobPhotos++;
              } catch (err) {
                sendError("photos", photo.filename, err instanceof Error ? err.message : "Unknown error");
              }
            }
          }

          // ---------------------------------------------------------------
          // Phase 6: Write manifest
          // ---------------------------------------------------------------
          accessToken = await oneDrive.getAccessToken(user.id);
          stats.completedAt = new Date().toISOString();

          const manifest = {
            version: "1.0",
            createdBy: "Printforge CRM",
            ...stats,
            errors: errors.length > 0 ? errors : undefined,
          };

          const manifestBuf = Buffer.from(JSON.stringify(manifest, null, 2), "utf-8");
          await oneDrive.uploadFile(accessToken, "manifest.json", "application/json", manifestBuf, backupRootId);

          // Update last sync time
          await prisma.cloudConnection.update({
            where: { id: connection.id },
            data: { lastSyncAt: new Date() },
          });

          send({
            type: "complete",
            stats,
            message: `Backup complete. ${stats.dataFiles} data files, ${stats.quotePdfs} quotes, ${stats.invoicePdfs} invoices, ${stats.designFiles} design files, ${stats.jobPhotos} photos.${stats.errors > 0 ? ` ${stats.errors} errors.` : ""}`,
          });
        } catch (err) {
          send({
            type: "error",
            phase: "fatal",
            message: err instanceof Error ? err.message : "Backup failed",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Backup error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to start backup" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
