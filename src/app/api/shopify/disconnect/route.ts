import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";
import { deleteWebhook } from "@/lib/shopify";

export async function POST() {
  try {
    const user = await requireFeature("shopify_sync");

    // Look up current connection
    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        shopifyShopDomain: true,
        shopifyAccessToken: true,
        shopifyWebhookId: true,
      },
    });

    // Delete webhook if registered
    if (current?.shopifyShopDomain && current?.shopifyAccessToken && current?.shopifyWebhookId) {
      try {
        await deleteWebhook(current.shopifyShopDomain, current.shopifyAccessToken, current.shopifyWebhookId);
      } catch {
        // Non-critical — clear connection anyway
      }
    }

    // Clear all Shopify fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        shopifyShopDomain: null,
        shopifyClientId: null,
        shopifyClientSecret: null,
        shopifyAccessToken: null,
        shopifyTokenExpiresAt: null,
        shopifyConnectedAt: null,
        shopifyLastSyncAt: null,
        shopifyWebhookId: null,
      },
    });

    return NextResponse.json({ disconnected: true });
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
