import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";
import { getAccessToken, fetchOrders, orderToJobNotes, findOrCreateShopifyClient } from "@/lib/shopify";
import { fireWebhooks } from "@/lib/webhooks";
import { log } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export async function POST() {
  try {
    const user = await requireFeature("shopify_sync");

    // Rate limit: 3 syncs per 60 min per user
    const rl = rateLimit(`shopify-sync:${user.id}`, { windowMs: 60 * 60 * 1000, maxRequests: 3 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Sync already ran recently. Please wait before syncing again." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    // Get valid access token (auto-refreshes if expired)
    const { token, shopDomain } = await getAccessToken(user.id);

    // Check which orders already have jobs (by Shopify order ID in notes)
    const existingJobs = await prisma.job.findMany({
      where: {
        userId: user.id,
        notes: { startsWith: "Shopify #" },
      },
      select: { notes: true },
    });

    // Determine how far back to look for orders
    // If no Shopify jobs exist (e.g. user deleted them all), always look back 90 days
    const lastSync = await prisma.user.findUnique({
      where: { id: user.id },
      select: { shopifyLastSyncAt: true },
    });

    const sinceDate = existingJobs.length === 0
      ? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      : lastSync?.shopifyLastSyncAt
        ? lastSync.shopifyLastSyncAt.toISOString()
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const orders = await fetchOrders(
      shopDomain,
      token,
      { created_at_min: sinceDate, limit: 50 }
    );

    const existingOrderNames = new Set(
      existingJobs
        .map((j) => {
          const match = j.notes?.match(/^Shopify (#\d+)/);
          return match ? match[1] : null;
        })
        .filter(Boolean)
    );

    let created = 0;
    let skipped = 0;

    for (const order of orders) {
      if (existingOrderNames.has(order.name)) {
        skipped++;
        continue;
      }

      const clientId = await findOrCreateShopifyClient(user.id, order);

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

      // Fire webhooks (non-blocking)
      fireWebhooks(user.id, "job.created", {
        jobId: job.id,
        status: "QUEUED",
        source: "shopify",
        shopifyOrderName: order.name,
      }).catch(() => {});

      created++;
    }

    // Update last sync timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { shopifyLastSyncAt: new Date() },
    });

    log({
      type: "system",
      level: "info",
      message: `Shopify sync: ${created} created, ${skipped} skipped from ${orders.length} orders`,
      userId: user.id,
    });

    return NextResponse.json({
      created,
      skipped,
      total: orders.length,
    });
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    log({
      type: "system",
      level: "error",
      message: "Shopify sync failed",
      detail: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
