import Stripe from "stripe";

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

/** Price IDs from env */
export function getStripePrices() {
  return {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? "",
    annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? "",
  };
}
