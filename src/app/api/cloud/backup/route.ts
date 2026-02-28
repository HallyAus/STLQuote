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
// CSV helpers
// ---------------------------------------------------------------------------

/** Escape a value for CSV: wrap in quotes if it contains comma, newline, or quote. */
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = value instanceof Date ? value.toISOString() : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Convert an array of flat objects to CSV string with header row. */
function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\n");
}

/** Flatten a row, omitting specified nested keys. */
function flatRow(obj: Record<string, unknown>, omitKeys: string[] = []): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (omitKeys.includes(key)) continue;
    if (Array.isArray(val) || (val && typeof val === "object" && !(val instanceof Date))) continue;
    result[key] = val;
  }
  return result;
}

// ---------------------------------------------------------------------------
// SSE helpers
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

        async function uploadCsv(
          accessToken: string,
          name: string,
          rows: Record<string, unknown>[],
          folderId: string
        ) {
          const csv = toCsv(rows);
          if (!csv) return; // skip empty
          const buf = Buffer.from(csv, "utf-8");
          await oneDrive.uploadFile(accessToken, name, "text/csv", buf, folderId);
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
          // Phase 1: CSV data export
          // ---------------------------------------------------------------
          const csvFiles: Array<{ name: string; generate: () => Promise<Record<string, unknown>[]> }> = [];

          // Settings (1 row, flat — redact Stripe ID)
          csvFiles.push({ name: "settings.csv", generate: async () => {
            const rows = await prisma.settings.findMany({ where: { userId: user.id } });
            return rows.map((r) => ({ ...flatRow(r as unknown as Record<string, unknown>), stripeConnectAccountId: r.stripeConnectAccountId ? "***REDACTED***" : "" }));
          }});

          // Printers
          csvFiles.push({ name: "printers.csv", generate: async () => {
            const rows = await prisma.printer.findMany({ where: { userId: user.id } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});

          // Materials
          csvFiles.push({ name: "materials.csv", generate: async () => {
            const rows = await prisma.material.findMany({ where: { userId: user.id } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});

          // Clients (flat) + Client Interactions (separate)
          csvFiles.push({ name: "clients.csv", generate: async () => {
            const rows = await prisma.client.findMany({ where: { userId: user.id } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});
          csvFiles.push({ name: "client-interactions.csv", generate: async () => {
            const rows = await prisma.clientInteraction.findMany({ where: { client: { userId: user.id } } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});

          // Quotes (flat) + Quote Line Items + Quote Events (separate CSVs)
          csvFiles.push({ name: "quotes.csv", generate: async () => {
            const rows = await prisma.quote.findMany({ where: { userId: user.id } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});
          csvFiles.push({ name: "quote-line-items.csv", generate: async () => {
            const rows = await prisma.quoteLineItem.findMany({ where: { quote: { userId: user.id } } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});
          csvFiles.push({ name: "quote-events.csv", generate: async () => {
            const rows = await prisma.quoteEvent.findMany({ where: { quote: { userId: user.id } } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});

          // Invoices (flat) + Invoice Line Items (separate)
          csvFiles.push({ name: "invoices.csv", generate: async () => {
            const rows = await prisma.invoice.findMany({ where: { userId: user.id } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});
          csvFiles.push({ name: "invoice-line-items.csv", generate: async () => {
            const rows = await prisma.invoiceLineItem.findMany({ where: { invoice: { userId: user.id } } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});

          // Jobs (flat) + Job Events (separate)
          csvFiles.push({ name: "jobs.csv", generate: async () => {
            const rows = await prisma.job.findMany({ where: { userId: user.id } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});
          csvFiles.push({ name: "job-events.csv", generate: async () => {
            const rows = await prisma.jobEvent.findMany({ where: { job: { userId: user.id } } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});

          // Designs (flat) + Design Files + Design Revisions (separate)
          csvFiles.push({ name: "designs.csv", generate: async () => {
            const rows = await prisma.design.findMany({ where: { userId: user.id } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});
          csvFiles.push({ name: "design-files.csv", generate: async () => {
            const rows = await prisma.designFile.findMany({ where: { design: { userId: user.id } } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});
          csvFiles.push({ name: "design-revisions.csv", generate: async () => {
            const rows = await prisma.designRevision.findMany({ where: { design: { userId: user.id } } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});

          // Suppliers (flat) + Supplier Items (separate)
          csvFiles.push({ name: "suppliers.csv", generate: async () => {
            const rows = await prisma.supplier.findMany({ where: { userId: user.id } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});
          csvFiles.push({ name: "supplier-items.csv", generate: async () => {
            const rows = await prisma.supplierItem.findMany({ where: { supplier: { userId: user.id } } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});

          // Consumables
          csvFiles.push({ name: "consumables.csv", generate: async () => {
            const rows = await prisma.consumable.findMany({ where: { userId: user.id } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});

          // Stock Transactions
          csvFiles.push({ name: "stock-transactions.csv", generate: async () => {
            const rows = await prisma.stockTransaction.findMany({ where: { userId: user.id } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});

          // Purchase Orders (flat) + PO Items (separate)
          csvFiles.push({ name: "purchase-orders.csv", generate: async () => {
            const rows = await prisma.purchaseOrder.findMany({ where: { userId: user.id } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});
          csvFiles.push({ name: "purchase-order-items.csv", generate: async () => {
            const rows = await prisma.purchaseOrderItem.findMany({ where: { purchaseOrder: { userId: user.id } } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});

          // Calculator Presets
          csvFiles.push({ name: "calculator-presets.csv", generate: async () => {
            const rows = await prisma.calculatorPreset.findMany({ where: { userId: user.id } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});

          // Webhooks (redact secrets)
          csvFiles.push({ name: "webhooks.csv", generate: async () => {
            const rows = await prisma.webhook.findMany({ where: { userId: user.id } });
            return rows.map((r) => ({ ...flatRow(r as unknown as Record<string, unknown>), secret: "***REDACTED***" }));
          }});

          // Part Drawings
          csvFiles.push({ name: "drawings.csv", generate: async () => {
            const rows = await prisma.partDrawing.findMany({ where: { userId: user.id } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});

          // Quote Templates
          csvFiles.push({ name: "quote-templates.csv", generate: async () => {
            const rows = await prisma.quoteTemplate.findMany({ where: { userId: user.id } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});

          // Upload Links (redact tokens) + Quote Requests (separate)
          csvFiles.push({ name: "upload-links.csv", generate: async () => {
            const rows = await prisma.uploadLink.findMany({ where: { userId: user.id } });
            return rows.map((r) => ({ ...flatRow(r as unknown as Record<string, unknown>), token: "***REDACTED***" }));
          }});
          csvFiles.push({ name: "quote-requests.csv", generate: async () => {
            const rows = await prisma.quoteRequest.findMany({ where: { userId: user.id } });
            return rows.map((r) => flatRow(r as unknown as Record<string, unknown>));
          }});

          // Upload all CSVs
          sendProgress("data", "Starting CSV data export...", 0, csvFiles.length);
          const dataFolderId = await oneDrive.createFolder(accessToken, "Data", backupRootId);

          for (let i = 0; i < csvFiles.length; i++) {
            const { name, generate } = csvFiles[i];
            try {
              sendProgress("data", name, i + 1, csvFiles.length);
              const rows = await generate();
              if (rows.length > 0) {
                await uploadCsv(accessToken, name, rows, dataFolderId);
              }
              stats.dataFiles++;
            } catch (err) {
              sendError("data", name, err instanceof Error ? err.message : "Unknown error");
            }
          }

          // ---------------------------------------------------------------
          // Phase 2: Quote PDFs
          // ---------------------------------------------------------------
          accessToken = await oneDrive.getAccessToken(user.id);

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
            format: "csv",
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
