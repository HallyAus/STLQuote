/**
 * Subscription tier definitions and feature gating.
 *
 * Free tier: calculator, quotes, PDF download, printers, materials, clients, jobs, STL/gcode upload
 * Pro tier: everything in Free + client portal, send email, invoicing, suppliers, consumables,
 *           webhooks, CSV export, job photos, business logo PDF, dashboard analytics, xero sync
 */

export type Tier = "free" | "pro";

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
  | "cloud_storage";

const PRO_FEATURES: Set<Feature> = new Set([
  "client_portal",
  "quote_email",
  "invoicing",
  "suppliers",
  "consumables",
  "webhooks",
  "csv_export",
  "job_photos",
  "business_logo",
  "dashboard_analytics",
  "xero_sync",
  "ai_assistant",
  "shopify_sync",
  "design_studio",
  "cloud_storage",
]);

/** Check if a feature requires Pro */
export function isProFeature(feature: Feature): boolean {
  return PRO_FEATURES.has(feature);
}

/** Check if user has access to a feature based on their effective tier */
export function hasFeature(tier: Tier, feature: Feature): boolean {
  if (!isProFeature(feature)) return true;
  return tier === "pro";
}

/** Get the user's effective tier, considering trial status and admin role */
export function getEffectiveTier(user: {
  subscriptionTier: string;
  subscriptionStatus: string;
  trialEndsAt: Date | string | null;
  role?: string;
}): Tier {
  // Admins always get Pro access
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    return "pro";
  }

  // Active paid subscription = pro
  if (user.subscriptionTier === "pro" && user.subscriptionStatus === "active") {
    return "pro";
  }

  // Active trial = pro
  if (user.subscriptionStatus === "trialing" && isTrialActive(user.trialEndsAt)) {
    return "pro";
  }

  return "free";
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

/** All Pro features for display */
export const PRO_FEATURE_LIST: { feature: Feature; label: string; description: string }[] = [
  { feature: "client_portal", label: "Client Portal", description: "Shareable quote links for client approval" },
  { feature: "quote_email", label: "Send Quotes via Email", description: "Email quotes directly to clients with PDF attachment" },
  { feature: "invoicing", label: "Invoicing", description: "Create, send, and track invoices with PDF generation" },
  { feature: "suppliers", label: "Suppliers", description: "Manage suppliers and track supplied items" },
  { feature: "consumables", label: "Consumables", description: "Track nozzles, build plates, and other consumables" },
  { feature: "webhooks", label: "Webhooks", description: "Trigger external services on quote and job events" },
  { feature: "csv_export", label: "CSV Export", description: "Export quotes, clients, and jobs to CSV" },
  { feature: "job_photos", label: "Job Photos", description: "Upload and manage photos for each job" },
  { feature: "business_logo", label: "Business Logo on PDF", description: "Your logo on quote and invoice PDFs" },
  { feature: "dashboard_analytics", label: "Dashboard Analytics", description: "Printer utilisation, top materials, and markup insights" },
  { feature: "xero_sync", label: "Xero Accounting Sync", description: "Sync invoices, contacts, and payments with Xero" },
  { feature: "ai_assistant", label: "AI Quote Assistant", description: "Describe a job in plain English and get a draft quote with line items" },
  { feature: "shopify_sync", label: "Shopify Integration", description: "Pull Shopify orders in as jobs automatically" },
  { feature: "design_studio", label: "Design Studio", description: "AI-powered product design planning and brainstorming" },
  { feature: "cloud_storage", label: "Cloud Storage", description: "Sync files with Google Drive and OneDrive" },
];

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
