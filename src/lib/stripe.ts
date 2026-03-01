import Stripe from "stripe";
import type { Tier } from "./tier";

let _stripe: Stripe | null = null;

/** Lazy-init Stripe client singleton */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  }
  return _stripe;
}

/** Price IDs from env — 6 prices for 3 paid tiers x 2 intervals */
export function getStripePrices() {
  return {
    starter_monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? "",
    starter_annual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID ?? "",
    pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? "",
    pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? "",
    scale_monthly: process.env.STRIPE_SCALE_MONTHLY_PRICE_ID ?? "",
    scale_annual: process.env.STRIPE_SCALE_ANNUAL_PRICE_ID ?? "",
  };
}

type PaidTier = Exclude<Tier, "hobby">;

/** Look up the Stripe price ID for a given tier + interval */
export function getPriceId(tier: PaidTier, interval: "month" | "year"): string {
  const prices = getStripePrices();
  const key = `${tier}_${interval === "month" ? "monthly" : "annual"}` as keyof ReturnType<typeof getStripePrices>;
  return prices[key];
}

/** Reverse lookup: Stripe price ID → tier name (for webhook processing) */
export function tierFromPriceId(priceId: string): PaidTier | null {
  const prices = getStripePrices();
  if (priceId === prices.starter_monthly || priceId === prices.starter_annual) return "starter";
  if (priceId === prices.pro_monthly || priceId === prices.pro_annual) return "pro";
  if (priceId === prices.scale_monthly || priceId === prices.scale_annual) return "scale";
  return null;
}
