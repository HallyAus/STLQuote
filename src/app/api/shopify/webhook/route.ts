import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookHmac, orderToJobNotes } from "@/lib/shopify";
import type { ShopifyOrder } from "@/lib/shopify";
import { fireWebhooks } from "@/lib/webhooks";
import { log } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const hmac = request.headers.get("x-shopify-hmac-sha256");
    const shopDomain = request.headers.get("x-shopify-shop-domain");

    // Verify HMAC if secret is configured
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (webhookSecret && hmac) {
      if (!verifyWebhookHmac(rawBody, hmac, webhookSecret)) {
        log({ type: "system", level: "warn", message: "Shopify webhook HMAC verification failed" });
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const order: ShopifyOrder = JSON.parse(rawBody);

    if (!shopDomain) {
      return NextResponse.json({ received: true });
    }

    // Find user by shop domain
    const user = await prisma.user.findFirst({
      where: { shopifyShopDomain: shopDomain.toLowerCase() },
      select: {
        id: true,
        shopifyAutoCreateJobs: true,
      },
    });

    if (!user) {
      // No user connected to this shop — ignore silently
      return NextResponse.json({ received: true });
    }

    if (!user.shopifyAutoCreateJobs) {
      return NextResponse.json({ received: true, skipped: "auto-create disabled" });
    }

    // Check for duplicate (order name in notes)
    const existing = await prisma.job.findFirst({
      where: {
        userId: user.id,
        notes: { startsWith: `Shopify ${order.name} ` },
      },
    });

    if (existing) {
      return NextResponse.json({ received: true, skipped: "duplicate" });
    }

    // Create job
    const job = await prisma.$transaction(async (tx) => {
      const newJob = await tx.job.create({
        data: {
          userId: user.id,
          notes: orderToJobNotes(order),
          status: "QUEUED",
        },
      });

      await tx.jobEvent.create({
        data: {
          jobId: newJob.id,
          fromStatus: null,
          toStatus: "QUEUED",
        },
      });

      return newJob;
    });

    // Fire user webhooks (non-blocking)
    fireWebhooks(user.id, "job.created", {
      jobId: job.id,
      status: "QUEUED",
      source: "shopify",
      shopifyOrderName: order.name,
    }).catch(() => {});

    // Update last sync timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { shopifyLastSyncAt: new Date() },
    });

    log({
      type: "system",
      level: "info",
      message: `Shopify webhook: created job for order ${order.name}`,
      userId: user.id,
    });

    return NextResponse.json({ received: true, jobId: job.id });
  } catch (err) {
    log({
      type: "system",
      level: "error",
      message: "Shopify webhook failed",
      detail: err instanceof Error ? err.message : String(err),
    });
    // Always return 200 to prevent Shopify retries
    return NextResponse.json({ received: true });
  }
}
