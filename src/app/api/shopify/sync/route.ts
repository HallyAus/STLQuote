import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";
import { fetchOrders, orderToJobNotes } from "@/lib/shopify";
import { fireWebhooks } from "@/lib/webhooks";
import { log } from "@/lib/logger";

export async function POST() {
  try {
    const user = await requireFeature("shopify_sync");

    // Get connection details
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        shopifyShopDomain: true,
        shopifyAccessToken: true,
        shopifyLastSyncAt: true,
      },
    });

    if (!userData?.shopifyShopDomain || !userData?.shopifyAccessToken) {
      return NextResponse.json(
        { error: "Shopify is not connected" },
        { status: 400 }
      );
    }

    // Fetch orders since last sync (or last 30 days)
    const sinceDate = userData.shopifyLastSyncAt
      ? userData.shopifyLastSyncAt.toISOString()
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const orders = await fetchOrders(
      userData.shopifyShopDomain,
      userData.shopifyAccessToken,
      { created_at_min: sinceDate, limit: 50 }
    );

    // Check which orders already have jobs (by Shopify order ID in notes)
    const existingJobs = await prisma.job.findMany({
      where: {
        userId: user.id,
        notes: { startsWith: "Shopify #" },
      },
      select: { notes: true },
    });

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
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
