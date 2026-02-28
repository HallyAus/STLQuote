import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookHmac, orderToJobNotes, findOrCreateShopifyClient } from "@/lib/shopify";
import { decryptOrPlaintext } from "@/lib/encryption";
import type { ShopifyOrder } from "@/lib/shopify";
import { fireWebhooks } from "@/lib/webhooks";
import { log } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const hmac = request.headers.get("x-shopify-hmac-sha256");
    const shopDomain = request.headers.get("x-shopify-shop-domain");

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
        shopifyClientSecret: true,
      },
    });

    if (!user) {
      return NextResponse.json({ received: true });
    }

    // Verify HMAC using user's client secret (reject if missing)
    if (!hmac || !user.shopifyClientSecret) {
      log({ type: "system", level: "warn", message: "Shopify webhook missing HMAC or client secret", userId: user.id });
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    const decryptedSecret = decryptOrPlaintext(user.shopifyClientSecret);
    if (!verifyWebhookHmac(rawBody, hmac, decryptedSecret)) {
      log({ type: "system", level: "warn", message: "Shopify webhook HMAC verification failed", userId: user.id });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (!user.shopifyAutoCreateJobs) {
      return NextResponse.json({ received: true, skipped: "auto-create disabled" });
    }

    // Check for duplicate (order name in notes)
    const existing = await prisma.job.findFirst({
      where: {
        userId: user.id,
        notes: { startsWith: `Shopify ${order.name}` },
      },
    });

    if (existing) {
      return NextResponse.json({ received: true, skipped: "duplicate" });
    }

    const clientId = await findOrCreateShopifyClient(user.id, order);

    // Create job
    const job = await prisma.$transaction(async (tx) => {
      const newJob = await tx.job.create({
        data: {
          userId: user.id,
          clientId,
          price: parseFloat(order.total_price) || null,
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
