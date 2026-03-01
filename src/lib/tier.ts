/**
 * Subscription tier definitions and feature gating.
 *
 * Hobby (free):  calculator, quotes (10), PDF download, printers (3), materials (5),
 *                clients (10), jobs, STL/gcode upload, templates, upload links
 * Starter:       everything in Hobby (no limits) + email, portal, logo, CSV, photos,
 *                analytics, bulk actions
 * Pro:           everything in Starter + invoicing, suppliers, consumables, AI,
 *                part drawings, webhooks
 * Scale:         everything in Pro + Shopify, Xero, Design Studio, Cloud Storage,
 *                Asana, priority support
 */

export type Tier = "hobby" | "starter" | "pro" | "scale";

export type Feature =
  | "client_portal"
  | "quote_email"
  | "invoicing"
  | "suppliers"
  | "consumables"
  | "webhooks"
  | "csv_export"
  | "job_photos"
  | "business_logo"
  | "dashboard_analytics"
  | "xero_sync"
  | "ai_assistant"
  | "shopify_sync"
  | "design_studio"
  | "cloud_storage"
  | "asana_sync"
  | "part_drawings";

/** Minimum tier required for each gated feature */
const FEATURE_TIER: Record<Feature, Tier> = {
  // Starter
  quote_email: "starter",
  client_portal: "starter",
  business_logo: "starter",
  csv_export: "starter",
  job_photos: "starter",
  dashboard_analytics: "starter",
  // Pro
  invoicing: "pro",
  suppliers: "pro",
  consumables: "pro",
  ai_assistant: "pro",
  part_drawings: "pro",
  webhooks: "pro",
  // Scale
  shopify_sync: "scale",
  xero_sync: "scale",
  design_studio: "scale",
  cloud_storage: "scale",
  asana_sync: "scale",
};

/** Numeric rank for tier comparison */
export const TIER_RANK: Record<Tier, number> = {
  hobby: 0,
  starter: 1,
  pro: 2,
  scale: 3,
};

/** All tiers in order */
export const TIERS: Tier[] = ["hobby", "starter", "pro", "scale"];

/** Display labels */
export const TIER_LABELS: Record<Tier, string> = {
  hobby: "Hobby",
  starter: "Starter",
  pro: "Pro",
  scale: "Scale",
};

/** Get the minimum tier required for a feature, or null if available to all */
export function getFeatureTier(feature: Feature): Tier | null {
  return FEATURE_TIER[feature] ?? null;
}

/** Check if a feature requires a paid tier (kept for backwards compat) */
export function isProFeature(feature: Feature): boolean {
  return feature in FEATURE_TIER;
}

/** Check if user has access to a feature based on their effective tier */
export function hasFeature(tier: Tier, feature: Feature): boolean {
  const required = FEATURE_TIER[feature];
  if (!required) return true; // not gated = available to all tiers
  return TIER_RANK[tier] >= TIER_RANK[required];
}

/** Get the user's effective tier, considering trial status and admin role */
export function getEffectiveTier(user: {
  subscriptionTier: string;
  subscriptionStatus: string;
  trialEndsAt: Date | string | null;
  role?: string;
}): Tier {
  // Admins always get Scale access
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    return "scale";
  }

  // Active trial = Scale
  if (user.subscriptionStatus === "trialing" && isTrialActive(user.trialEndsAt)) {
    return "scale";
  }

  // Active paid subscription — read tier directly
  if (user.subscriptionStatus === "active") {
    const tier = user.subscriptionTier as Tier;
    if (tier in TIER_RANK) return tier;
  }

  return "hobby";
}

/** Check if a trial is still active */
export function isTrialActive(trialEndsAt: Date | string | null): boolean {
  if (!trialEndsAt) return false;
  const endsAt = typeof trialEndsAt === "string" ? new Date(trialEndsAt) : trialEndsAt;
  return endsAt > new Date();
}

/** Get remaining trial days (0 if expired or no trial) */
export function trialDaysRemaining(trialEndsAt: Date | string | null): number {
  if (!trialEndsAt) return 0;
  const endsAt = typeof trialEndsAt === "string" ? new Date(trialEndsAt) : trialEndsAt;
  const diff = endsAt.getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Quantity limits for Hobby tier (null = unlimited) */
export function getTierLimits(tier: Tier): { quotes: number; printers: number; materials: number; clients: number } | null {
  if (tier === "hobby") {
    return { quotes: 10, printers: 3, materials: 5, clients: 10 };
  }
  return null; // paid tiers have no limits
}

/** All gated features for display, grouped by minimum tier */
export const FEATURE_LIST: { feature: Feature; label: string; description: string; tier: Tier }[] = [
  // Starter features
  { feature: "quote_email", label: "Send Quotes via Email", description: "Email quotes directly to clients with PDF attachment", tier: "starter" },
  { feature: "client_portal", label: "Client Portal", description: "Shareable quote links for client approval", tier: "starter" },
  { feature: "business_logo", label: "Business Logo on PDF", description: "Your logo on quote and invoice PDFs", tier: "starter" },
  { feature: "csv_export", label: "CSV Export", description: "Export quotes, clients, and jobs to CSV", tier: "starter" },
  { feature: "job_photos", label: "Job Photos", description: "Upload and manage photos for each job", tier: "starter" },
  { feature: "dashboard_analytics", label: "Dashboard Analytics", description: "Printer utilisation, top materials, and markup insights", tier: "starter" },
  // Pro features
  { feature: "invoicing", label: "Invoicing", description: "Create, send, and track invoices with PDF generation", tier: "pro" },
  { feature: "suppliers", label: "Suppliers", description: "Manage suppliers and track supplied items", tier: "pro" },
  { feature: "consumables", label: "Consumables", description: "Track nozzles, build plates, and other consumables", tier: "pro" },
  { feature: "ai_assistant", label: "AI Quote Assistant", description: "Describe a job in plain English and get a draft quote with line items", tier: "pro" },
  { feature: "part_drawings", label: "Part Drawings", description: "Generate technical drawings from STL files with orthographic views", tier: "pro" },
  { feature: "webhooks", label: "Webhooks", description: "Trigger external services on quote and job events", tier: "pro" },
  // Scale features
  { feature: "shopify_sync", label: "Shopify Integration", description: "Pull Shopify orders in as jobs automatically", tier: "scale" },
  { feature: "xero_sync", label: "Xero Accounting Sync", description: "Sync invoices, contacts, and payments with Xero", tier: "scale" },
  { feature: "design_studio", label: "Design Studio", description: "AI-powered product design planning and brainstorming", tier: "scale" },
  { feature: "cloud_storage", label: "Cloud Storage", description: "Sync files with Google Drive and OneDrive", tier: "scale" },
  { feature: "asana_sync", label: "Asana Integration", description: "Auto-create Asana tasks from quote requests", tier: "scale" },
];

/** @deprecated Use FEATURE_LIST instead */
export const PRO_FEATURE_LIST = FEATURE_LIST;

/** Check if user has access to a feature, considering per-user overrides */
export function hasFeatureWithOverrides(
  tier: Tier,
  feature: Feature,
  overrides?: Record<string, string>
): boolean {
  if (overrides?.[feature] === "enabled") return true;
  if (overrides?.[feature] === "disabled") return false;
  return hasFeature(tier, feature);
}
