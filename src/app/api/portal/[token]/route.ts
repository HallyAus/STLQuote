import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { token } = await context.params;

    // Rate limit by IP to prevent token enumeration
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`portal:${ip}`, { windowMs: 15 * 60 * 1000, maxRequests: 30 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const quote = await prisma.quote.findUnique({
      where: { portalToken: token },
      include: {
        client: {
          select: { name: true, email: true, company: true },
        },
        lineItems: {
          select: {
            id: true,
            description: true,
            materialCost: true,
            machineCost: true,
            labourCost: true,
            overheadCost: true,
            lineTotal: true,
            quantity: true,
          },
        },
        user: {
          select: {
            settings: {
              select: {
                businessName: true,
                businessEmail: true,
                businessPhone: true,
              },
            },
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Enforce portal link expiry (30 days from creation)
    const maxPortalAge = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - new Date(quote.createdAt).getTime() > maxPortalAge) {
      return NextResponse.json({ error: "This quote link has expired" }, { status: 410 });
    }

    // Log portal view (fire-and-forget)
    prisma.quoteEvent.create({
      data: {
        quoteId: quote.id,
        action: "viewed",
        detail: "Viewed via client portal",
      },
    }).catch((err) => console.error("Failed to log quote event:", err));

    // Return sanitised data (no internal IDs exposed beyond what's needed)
    return NextResponse.json({
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      subtotal: quote.subtotal,
      markupPct: quote.markupPct,
      taxPct: quote.taxPct,
      taxLabel: quote.taxLabel,
      tax: quote.tax,
      taxInclusive: quote.taxInclusive,
      total: quote.total,
      currency: quote.currency,
      notes: quote.notes,
      terms: quote.terms,
      expiryDate: quote.expiryDate,
      createdAt: quote.createdAt,
      client: quote.client,
      lineItems: quote.lineItems,
      business: {
        name: quote.user?.settings?.businessName || null,
        email: quote.user?.settings?.businessEmail || null,
        phone: quote.user?.settings?.businessPhone || null,
      },
    });
  } catch (error) {
    console.error("Portal fetch error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
