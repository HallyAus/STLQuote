import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";
import { fetchShop, normaliseShopDomain, registerOrderWebhook } from "@/lib/shopify";
import { z } from "zod";

const connectSchema = z.object({
  shopDomain: z.string().min(1, "Store URL is required"),
  accessToken: z.string().min(1, "Access token is required"),
});

export async function POST(request: Request) {
  try {
    const user = await requireFeature("shopify_sync");

    const body = await request.json();
    const parsed = connectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const shopDomain = normaliseShopDomain(parsed.data.shopDomain);
    const accessToken = parsed.data.accessToken.trim();

    // Validate credentials by fetching shop info
    const shop = await fetchShop(shopDomain, accessToken);

    // Optionally register webhook for automatic order sync
    const appUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "";
    let webhookId: string | null = null;
    if (appUrl) {
      webhookId = await registerOrderWebhook(
        shopDomain,
        accessToken,
        `${appUrl}/api/shopify/webhook`
      );
    }

    // Save connection
    await prisma.user.update({
      where: { id: user.id },
      data: {
        shopifyShopDomain: shop.myshopify_domain || shopDomain,
        shopifyAccessToken: accessToken,
        shopifyConnectedAt: new Date(),
        shopifyWebhookId: webhookId,
      },
    });

    return NextResponse.json({
      connected: true,
      shopDomain: shop.myshopify_domain || shopDomain,
      shopName: shop.name,
    });
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to connect to Shopify" },
      { status: 500 }
    );
  }
}
