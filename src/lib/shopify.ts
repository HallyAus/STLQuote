/**
 * Shopify Admin REST API helpers.
 *
 * Uses raw fetch — no SDK. Custom app approach (access token, not OAuth).
 * API version: 2024-01
 */

import crypto from "crypto";

const API_VERSION = "2024-01";

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
        ? "Invalid access token. Please check your token and try again."
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
  params?: { since_id?: string; created_at_min?: string; limit?: number; status?: string }
): Promise<ShopifyOrder[]> {
  const query = new URLSearchParams();
  query.set("status", params?.status ?? "any");
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
// HMAC verification
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
  // Strip protocol
  domain = domain.replace(/^https?:\/\//, "");
  // Strip trailing slash/path
  domain = domain.split("/")[0];
  // If they just typed the shop name, add .myshopify.com
  if (!domain.includes(".")) {
    domain = `${domain}.myshopify.com`;
  }
  return domain;
}

/** Build job notes from a Shopify order */
export function orderToJobNotes(order: ShopifyOrder): string {
  const customerName = order.customer
    ? [order.customer.first_name, order.customer.last_name].filter(Boolean).join(" ")
    : "Unknown customer";
  const customerEmail = order.customer?.email ?? order.email ?? "";

  const lines = [
    `Shopify ${order.name} — ${customerName}${customerEmail ? ` (${customerEmail})` : ""}`,
  ];

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

  lines.push("", `Total: $${order.total_price} ${order.currency}`);

  return lines.join("\n");
}
