import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

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

    const quote = await prisma.quote.findUnique({
      where: { portalToken: token },
      include: {
        client: { select: { name: true } },
        user: {
          select: {
            email: true,
            settings: { select: { businessName: true } },
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

    // Notify quote owner
    if (quote.user?.email) {
      const clientName = quote.client?.name || "A client";
      const actionText = parsed.data.action === "accept" ? "accepted" : "rejected";
      try {
        await sendEmail({
          to: quote.user.email,
          subject: `Quote ${quote.quoteNumber} ${actionText}`,
          type: "notification",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #171717;">Quote ${quote.quoteNumber} ${actionText}</h2>
              <p><strong>${clientName}</strong> has ${actionText} quote <strong>${quote.quoteNumber}</strong> ($${quote.total.toFixed(2)} ${quote.currency}).</p>
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
              <p style="color: #999; font-size: 12px;">Printforge Quote Notification</p>
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
