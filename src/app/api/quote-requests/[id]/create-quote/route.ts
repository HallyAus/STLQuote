import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";

async function generateQuoteNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PF-${year}-`;
  const latest = await prisma.quote.findFirst({
    where: { userId, quoteNumber: { startsWith: prefix } },
    orderBy: { quoteNumber: "desc" },
    select: { quoteNumber: true },
  });
  let nextSeq = 1;
  if (latest?.quoteNumber) {
    const seqStr = latest.quoteNumber.replace(prefix, "");
    const lastSeq = parseInt(seqStr, 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }
  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const rl = rateLimit(`qr-create-quote:${user.id}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 20,
    });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const { id } = await params;

    const request = await prisma.quoteRequest.findFirst({
      where: { id, userId: user.id },
    });
    if (!request) {
      return NextResponse.json(
        { error: "Quote request not found" },
        { status: 404 }
      );
    }

    // Auto-match client by email
    let clientId: string | null = null;
    if (request.clientEmail) {
      const client = await prisma.client.findFirst({
        where: { userId: user.id, email: request.clientEmail },
        select: { id: true },
      });
      if (client) clientId = client.id;
    }

    // Build notes from request fields
    const notesParts: string[] = [];
    notesParts.push(`Customer: ${request.clientName}`);
    if (request.clientEmail) notesParts.push(`Email: ${request.clientEmail}`);
    notesParts.push(`File: ${request.originalName}`);
    if (request.description) notesParts.push(`Notes: ${request.description}`);

    // Fetch user settings for defaults
    const settings = await prisma.settings.findFirst({
      where: { userId: user.id },
      select: {
        defaultMarkupPct: true,
        defaultTaxPct: true,
        taxLabel: true,
        taxInclusive: true,
      },
    });

    const quoteNumber = await generateQuoteNumber(user.id);
    const markupPct = settings?.defaultMarkupPct ?? 0;
    const taxPct = settings?.defaultTaxPct ?? 10;

    const quote = await prisma.$transaction(async (tx) => {
      const created = await tx.quote.create({
        data: {
          userId: user.id,
          quoteNumber,
          clientId,
          notes: notesParts.join("\n"),
          markupPct,
          taxPct,
          taxLabel: settings?.taxLabel ?? "GST",
          taxInclusive: settings?.taxInclusive ?? false,
          subtotal: 0,
          tax: 0,
          total: 0,
        },
        include: { lineItems: true },
      });

      await tx.quoteEvent.create({
        data: {
          quoteId: created.id,
          action: "created",
          detail: `Quote ${quoteNumber} created from customer request (${request.originalName})`,
          actorId: user.id,
        },
      });

      // Update request status to QUOTED
      await tx.quoteRequest.update({
        where: { id: request.id },
        data: { status: "QUOTED" },
      });

      return created;
    });

    return NextResponse.json(
      { quoteId: quote.id, quoteNumber: quote.quoteNumber },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create quote from request:", error);
    return NextResponse.json(
      { error: "Failed to create quote" },
      { status: 500 }
    );
  }
}
