import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { pushContactToXero, pushInvoiceToXero } from "@/lib/xero";
import { log } from "@/lib/logger";

export async function POST() {
  try {
    const user = await requireFeature("xero_sync");

    // Verify user has Xero connected
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { xeroAccessToken: true },
    });

    if (!dbUser?.xeroAccessToken) {
      return NextResponse.json(
        { error: "Xero is not connected. Please connect first." },
        { status: 400 }
      );
    }

    // ---- Sync contacts ----
    const clients = await prisma.client.findMany({
      where: { userId: user.id },
      select: { name: true, email: true, phone: true },
    });

    let contactsSynced = 0;
    const contactErrors: string[] = [];

    for (const client of clients) {
      try {
        await pushContactToXero(user.id, client);
        contactsSynced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        contactErrors.push(`${client.name}: ${msg}`);
        console.error(`Xero sync contact "${client.name}" failed:`, err);
      }
    }

    // ---- Sync invoices ----
    const invoices = await prisma.invoice.findMany({
      where: {
        userId: user.id,
        status: { in: ["SENT", "PAID", "OVERDUE"] },
      },
      include: {
        client: { select: { name: true } },
        lineItems: {
          select: {
            description: true,
            quantity: true,
            unitPrice: true,
          },
        },
      },
    });

    let invoicesSynced = 0;
    const invoiceErrors: string[] = [];

    for (const invoice of invoices) {
      try {
        const contactName = invoice.client?.name ?? "Unknown Client";
        const lineItems = invoice.lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitAmount: li.unitPrice,
        }));

        await pushInvoiceToXero(user.id, {
          invoiceNumber: invoice.invoiceNumber,
          contactName,
          lineItems,
          dueDate: invoice.dueDate?.toISOString().split("T")[0],
          currency: invoice.currency,
        });

        invoicesSynced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        invoiceErrors.push(`${invoice.invoiceNumber}: ${msg}`);
        console.error(`Xero sync invoice "${invoice.invoiceNumber}" failed:`, err);
      }
    }

    // Log sync results
    const totalErrors = contactErrors.length + invoiceErrors.length;
    await log({
      type: "xero_sync",
      level: totalErrors > 0 ? "warn" : "info",
      message: `Xero sync: ${contactsSynced} contacts, ${invoicesSynced} invoices synced${totalErrors > 0 ? `, ${totalErrors} error(s)` : ""}`,
      detail: totalErrors > 0 ? JSON.stringify({ contactErrors, invoiceErrors }, null, 2) : undefined,
      userId: user.id,
    });

    return NextResponse.json({
      synced: {
        contacts: contactsSynced,
        invoices: invoicesSynced,
      },
      errors: {
        contacts: contactErrors,
        invoices: invoiceErrors,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("Xero sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync with Xero" },
      { status: 500 }
    );
  }
}
