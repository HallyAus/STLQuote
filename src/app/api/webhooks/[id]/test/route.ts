import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { isPrivateUrl } from "@/lib/url-safety";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await context.params;

    const webhook = await prisma.webhook.findFirst({
      where: { id, userId: user.id },
    });

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    // SSRF prevention
    if (isPrivateUrl(webhook.url)) {
      return NextResponse.json(
        { error: "Webhook URL points to a private network and cannot be tested" },
        { status: 400 }
      );
    }

    const body = JSON.stringify({
      event: "test",
      timestamp: new Date().toISOString(),
      data: { message: "This is a test webhook from Printforge Quote." },
    });

    const signature = crypto
      .createHmac("sha256", webhook.secret)
      .update(body)
      .digest("hex");

    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": `sha256=${signature}`,
          "X-Webhook-Event": "test",
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      await prisma.webhook.update({
        where: { id },
        data: {
          lastFiredAt: new Date(),
          lastStatus: res.status,
        },
      });

      return NextResponse.json({
        success: res.ok,
        status: res.status,
        message: res.ok ? "Test webhook sent successfully." : `Webhook returned ${res.status}.`,
      });
    } catch (error) {
      await prisma.webhook.update({
        where: { id },
        data: {
          lastFiredAt: new Date(),
          lastStatus: 0,
        },
      });

      return NextResponse.json({
        success: false,
        status: 0,
        message: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  } catch (error) {
    console.error("Test webhook error:", error);
    return NextResponse.json({ error: "Test failed" }, { status: 500 });
  }
}
