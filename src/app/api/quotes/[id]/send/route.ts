import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { sendQuoteEmail } from "@/lib/email";
import { generateToken } from "@/lib/tokens";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
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

    // Fetch business name from settings
    const settings = await prisma.settings.findUnique({
      where: { userId: user.id },
      select: { businessName: true },
    });

    // Send email
    const sent = await sendQuoteEmail({
      to: quote.client.email,
      quoteNumber: quote.quoteNumber,
      total: quote.total,
      currency: quote.currency,
      portalUrl,
      businessName: settings?.businessName || undefined,
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

    return NextResponse.json({
      message: sent ? "Quote sent successfully." : "Quote marked as sent (SMTP not configured).",
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
