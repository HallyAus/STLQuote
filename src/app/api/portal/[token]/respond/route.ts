import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail, escapeHtml } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

type RouteContext = { params: Promise<{ token: string }> };

const schema = z.object({
  action: z.enum(["accept", "reject"]),
});

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { token } = await context.params;

    // Rate limit: 10 responses per 60 min per IP
    const ip = getClientIp(request);
    const rl = rateLimit(`portal-respond:${ip}`, { windowMs: 60 * 60 * 1000, maxRequests: 10 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const quote = await prisma.quote.findUnique({
      where: { portalToken: token },
      include: {
        client: { select: { name: true, email: true, phone: true, company: true } },
        lineItems: { select: { description: true, lineTotal: true, quantity: true } },
        user: {
          select: {
            email: true,
            settings: {
              select: {
                businessName: true,
                businessEmail: true,
                businessPhone: true,
                businessAddress: true,
              },
            },
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Only allow responding to SENT quotes
    if (quote.status !== "SENT") {
      return NextResponse.json(
        { error: `This quote has already been ${quote.status.toLowerCase()}.` },
        { status: 400 }
      );
    }

    // Enforce expiry date
    if (quote.expiryDate && new Date(quote.expiryDate) < new Date()) {
      return NextResponse.json(
        { error: "This quote has expired and can no longer be accepted." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    const newStatus = parsed.data.action === "accept" ? "ACCEPTED" : "REJECTED";

    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: newStatus },
    });

    // Log accept/reject event
    prisma.quoteEvent.create({
      data: {
        quoteId: quote.id,
        action: parsed.data.action === "accept" ? "accepted" : "rejected",
        detail: `${quote.client?.name || "Client"} ${parsed.data.action === "accept" ? "accepted" : "rejected"} via portal`,
      },
    }).catch((err) => console.error("Failed to log quote event:", err));

    const businessName = escapeHtml(quote.user?.settings?.businessName || "Printforge");
    const businessEmail = escapeHtml(quote.user?.settings?.businessEmail || quote.user?.email || "");
    const businessPhone = quote.user?.settings?.businessPhone ? escapeHtml(quote.user.settings.businessPhone) : null;
    const clientName = escapeHtml(quote.client?.name || "A client");
    const actionText = parsed.data.action === "accept" ? "accepted" : "rejected";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Enhanced owner notification
    if (quote.user?.email) {
      const lineItemSummary = quote.lineItems
        .map((li) => `${escapeHtml(li.description)} (x${li.quantity}) — $${li.lineTotal.toFixed(2)}`)
        .join("<br />");

      try {
        await sendEmail({
          to: quote.user.email,
          subject: `Quote ${quote.quoteNumber} ${actionText} by ${clientName}`,
          type: "notification",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #2563eb; padding: 20px 24px; border-radius: 8px 8px 0 0;">
                <h2 style="color: white; margin: 0; font-size: 18px;">${businessName}</h2>
              </div>
              <div style="border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
                <h3 style="color: #171717; margin: 0 0 8px;">Quote ${quote.quoteNumber} ${actionText}</h3>
                <p style="color: #555;"><strong>${clientName}</strong> has ${actionText} this quote.</p>

                <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="margin: 0 0 4px; font-size: 13px; color: #666;">Total</p>
                  <p style="margin: 0; font-size: 22px; font-weight: bold; color: #171717;">$${quote.total.toFixed(2)} ${quote.currency}</p>
                </div>

                ${quote.lineItems.length > 0 ? `
                <div style="margin: 16px 0;">
                  <p style="font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; margin-bottom: 8px;">Line Items</p>
                  <p style="font-size: 13px; color: #555; line-height: 1.6;">${lineItemSummary}</p>
                </div>` : ""}

                <div style="margin: 16px 0; padding: 12px; background: #f9fafb; border-radius: 6px;">
                  <p style="font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; margin: 0 0 6px;">Client Contact</p>
                  <p style="font-size: 13px; color: #333; margin: 0;">${clientName}${quote.client?.company ? ` — ${escapeHtml(quote.client.company)}` : ""}</p>
                  ${quote.client?.email ? `<p style="font-size: 13px; color: #555; margin: 2px 0;">${escapeHtml(quote.client.email)}</p>` : ""}
                  ${quote.client?.phone ? `<p style="font-size: 13px; color: #555; margin: 2px 0;">${escapeHtml(quote.client.phone)}</p>` : ""}
                </div>

                <p style="margin: 24px 0 16px;">
                  <a href="${appUrl}/quotes/${quote.id}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                    View Quote
                  </a>
                </p>

                ${parsed.data.action === "reject" ? `<p style="color: #666; font-size: 13px;">Consider revising and resending the quote — clients often reconsider with an adjusted offer.</p>` : ""}
              </div>
              <p style="color: #999; font-size: 12px; text-align: center; margin-top: 16px;">${businessName} — Powered by Printforge</p>
            </div>
          `,
        });
      } catch {
        // Non-blocking
      }
    }

    // Win-back email to client on rejection
    if (parsed.data.action === "reject" && quote.client?.email) {
      const contactLines = [
        businessEmail ? `Email: ${businessEmail}` : null,
        businessPhone ? `Phone: ${businessPhone}` : null,
      ].filter(Boolean).join(" | ");

      try {
        await sendEmail({
          to: quote.client.email,
          subject: `Thank you for considering ${businessName}`,
          type: "quote",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #2563eb; padding: 20px 24px; border-radius: 8px 8px 0 0;">
                <h2 style="color: white; margin: 0; font-size: 18px;">${businessName}</h2>
              </div>
              <div style="border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
                <p style="color: #333; font-size: 15px;">Hi ${clientName},</p>
                <p style="color: #555;">Thank you for taking the time to review our quote <strong>${quote.quoteNumber}</strong>. We understand it wasn't the right fit this time.</p>
                <p style="color: #555;">If anything changes or you'd like us to revise the quote, we'd love the chance to work together. Just reply to this email or get in touch — no pressure at all.</p>
                ${contactLines ? `
                <div style="background: #f9fafb; border-radius: 6px; padding: 14px; margin: 20px 0;">
                  <p style="font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; margin: 0 0 6px;">Get in Touch</p>
                  <p style="font-size: 13px; color: #555; margin: 0;">${contactLines}</p>
                </div>` : ""}
                <p style="color: #555;">All the best,<br /><strong>${businessName}</strong></p>
              </div>
              <p style="color: #999; font-size: 12px; text-align: center; margin-top: 16px;">${businessName} — Powered by Printforge</p>
            </div>
          `,
        });
      } catch {
        // Non-blocking
      }
    }

    return NextResponse.json({
      message: `Quote ${parsed.data.action === "accept" ? "accepted" : "rejected"} successfully.`,
      status: newStatus,
    });
  } catch (error) {
    console.error("Portal respond error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
