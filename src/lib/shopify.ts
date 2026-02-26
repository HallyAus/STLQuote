/**
 * Shopify Admin REST API helpers.
 *
 * Uses client credentials grant (client ID + client secret → short-lived access token).
 * Tokens expire every 24 hours and are auto-refreshed.
 * API version: 2024-01
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const API_VERSION = "2024-01";

// ---------------------------------------------------------------------------
// Token exchange (client credentials grant)
// ---------------------------------------------------------------------------

interface TokenResponse {
  access_token: string;
  scope: string;
  expires_in: number; // seconds (86399 = ~24hrs)
}

/** Exchange client ID + secret for a short-lived access token */
export async function exchangeForAccessToken(
  shopDomain: string,
  clientId: string,
  clientSecret: string
): Promise<TokenResponse> {
  const url = `https://${shopDomain}/admin/oauth/access_token`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      throw new Error("Invalid client ID or secret. Please check your credentials and try again.");
    }
    if (text.includes("app_not_installed")) {
      throw new Error(
        "App not installed. Go to your Shopify admin → Settings → Apps → Develop apps → " +
        "select your app → click \"Install app\" and confirm, then try connecting again."
      );
    }
    throw new Error(`Shopify token exchange failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return res.json();
}

/** Get a valid access token for a user, refreshing if expired */
export async function getAccessToken(userId: string): Promise<{ token: string; shopDomain: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      shopifyShopDomain: true,
      shopifyClientId: true,
      shopifyClientSecret: true,
      shopifyAccessToken: true,
      shopifyTokenExpiresAt: true,
    },
  });

  if (!user?.shopifyShopDomain || !user?.shopifyClientId || !user?.shopifyClientSecret) {
    throw new Error("Shopify is not connected");
  }

  // Check if existing token is still valid (with 5-minute buffer)
  const bufferMs = 5 * 60 * 1000;
  if (
    user.shopifyAccessToken &&
    user.shopifyTokenExpiresAt &&
    user.shopifyTokenExpiresAt.getTime() > Date.now() + bufferMs
  ) {
    return { token: user.shopifyAccessToken, shopDomain: user.shopifyShopDomain };
  }

  // Token expired or missing — exchange for a new one
  const tokenData = await exchangeForAccessToken(
    user.shopifyShopDomain,
    user.shopifyClientId,
    user.shopifyClientSecret
  );

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      shopifyAccessToken: tokenData.access_token,
      shopifyTokenExpiresAt: expiresAt,
    },
  });

  return { token: tokenData.access_token, shopDomain: user.shopifyShopDomain };
}

// ---------------------------------------------------------------------------
// Core fetch
// ---------------------------------------------------------------------------

interface ShopifyFetchOpts {
  method?: string;
  body?: unknown;
}

export async function shopifyAdminFetch(
  shopDomain: string,
  accessToken: string,
  path: string,
  opts: ShopifyFetchOpts = {}
): Promise<Response> {
  const url = `https://${shopDomain}/admin/api/${API_VERSION}${path}`;
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return res;
}

// ---------------------------------------------------------------------------
// Shop validation
// ---------------------------------------------------------------------------

export interface ShopInfo {
  id: number;
  name: string;
  email: string;
  domain: string;
  myshopify_domain: string;
  currency: string;
}

export async function fetchShop(
  shopDomain: string,
  accessToken: string
): Promise<ShopInfo> {
  const res = await shopifyAdminFetch(shopDomain, accessToken, "/shop.json");
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      res.status === 401
        ? "Invalid credentials. Please check your client ID and secret."
        : `Shopify API error (${res.status}): ${text.slice(0, 200)}`
    );
  }
  const data = await res.json();
  return data.shop;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface ShopifyLineItem {
  id: number;
  title: string;
  quantity: number;
  price: string;
  sku: string | null;
  variant_title: string | null;
}

export interface ShopifyOrder {
  id: number;
  name: string; // e.g. "#1001"
  email: string | null;
  created_at: string;
  total_price: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  customer: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  line_items: ShopifyLineItem[];
  note: string | null;
}

export async function fetchOrders(
  shopDomain: string,
  accessToken: string,
  params?: { since_id?: string; created_at_min?: string; limit?: number; status?: string; fulfillment_status?: string }
): Promise<ShopifyOrder[]> {
  const query = new URLSearchParams();
  query.set("status", params?.status ?? "open");
  query.set("fulfillment_status", params?.fulfillment_status ?? "unfulfilled");
  query.set("limit", String(params?.limit ?? 50));
  if (params?.since_id) query.set("since_id", params.since_id);
  if (params?.created_at_min) query.set("created_at_min", params.created_at_min);

  const res = await shopifyAdminFetch(
    shopDomain,
    accessToken,
    `/orders.json?${query.toString()}`
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch orders (${res.status})`);
  }
  const data = await res.json();
  return data.orders ?? [];
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

export async function registerOrderWebhook(
  shopDomain: string,
  accessToken: string,
  callbackUrl: string
): Promise<string | null> {
  const res = await shopifyAdminFetch(shopDomain, accessToken, "/webhooks.json", {
    method: "POST",
    body: {
      webhook: {
        topic: "orders/create",
        address: callbackUrl,
        format: "json",
      },
    },
  });
  if (!res.ok) {
    // Non-critical — manual sync still works
    console.error("Failed to register Shopify webhook:", await res.text().catch(() => ""));
    return null;
  }
  const data = await res.json();
  return String(data.webhook?.id ?? "");
}

export async function deleteWebhook(
  shopDomain: string,
  accessToken: string,
  webhookId: string
): Promise<void> {
  await shopifyAdminFetch(shopDomain, accessToken, `/webhooks/${webhookId}.json`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// HMAC verification (uses client secret)
// ---------------------------------------------------------------------------

export function verifyWebhookHmac(
  rawBody: string,
  hmacHeader: string,
  secret: string
): boolean {
  const computed = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(hmacHeader)
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise shop domain to xxx.myshopify.com format */
export function normaliseShopDomain(input: string): string {
  let domain = input.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, "");
  domain = domain.split("/")[0];
  if (!domain.includes(".")) {
    domain = `${domain}.myshopify.com`;
  }
  return domain;
}

/** Build job notes from a Shopify order (client + price stored separately) */
export function orderToJobNotes(order: ShopifyOrder): string {
  const lines = [`Shopify ${order.name}`];

  if (order.line_items.length > 0) {
    lines.push("", "Items:");
    for (const item of order.line_items) {
      const variant = item.variant_title ? ` (${item.variant_title})` : "";
      lines.push(`- ${item.title}${variant} x${item.quantity} — $${item.price}`);
    }
  }

  if (order.note) {
    lines.push("", `Order note: ${order.note}`);
  }

  return lines.join("\n");
}

/** Find an existing client by email or create a new one from Shopify order data */
export async function findOrCreateShopifyClient(
  userId: string,
  order: ShopifyOrder
): Promise<string | null> {
  const email = order.customer?.email ?? order.email;
  const firstName = order.customer?.first_name ?? "";
  const lastName = order.customer?.last_name ?? "";
  const name = [firstName, lastName].filter(Boolean).join(" ") || null;

  if (!name && !email) return null;

  // Try to find by email first (most reliable match)
  if (email) {
    const existing = await prisma.client.findFirst({
      where: { userId, email: email.toLowerCase() },
      select: { id: true },
    });
    if (existing) return existing.id;
  }

  // Create new client
  const client = await prisma.client.create({
    data: {
      userId,
      name: name || email || "Shopify Customer",
      email: email?.toLowerCase() ?? null,
      tags: ["shopify"],
    },
  });

  return client.id;
}
