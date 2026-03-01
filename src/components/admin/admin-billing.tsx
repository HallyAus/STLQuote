"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Loader2,
  RefreshCw,
  CircleCheck,
  CircleX,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";

interface BillingData {
  stats: {
    totalUsers: number;
    starterUsers: number;
    proUsers: number;
    scaleUsers: number;
    paidUsers: number;
    trialUsers: number;
    hobbyUsers: number;
  };
  stripeSubscribers: {
    id: string;
    name: string | null;
    email: string | null;
    subscriptionTier: string;
    subscriptionStatus: string;
    subscriptionEndsAt: string | null;
    createdAt: string;
  }[];
  events: {
    id: string;
    userId: string;
    action: string;
    detail: string | null;
    createdAt: string;
    user: { name: string | null; email: string | null };
  }[];
  config: {
    stripeSecretKey: boolean;
    stripeWebhookSecret: boolean;
    starterMonthlyPriceId: boolean;
    starterAnnualPriceId: boolean;
    proMonthlyPriceId: boolean;
    proAnnualPriceId: boolean;
    scaleMonthlyPriceId: boolean;
    scaleAnnualPriceId: boolean;
    appUrl: string | null;
  };
}

type PaidTier = "starter" | "pro" | "scale";

const TIER_PRICES: Record<PaidTier, { monthly: number; annual: number }> = {
  starter: { monthly: 12, annual: 108 },
  pro: { monthly: 24, annual: 216 },
  scale: { monthly: 49, annual: 468 },
};

export function AdminBilling() {
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const fetchBilling = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/billing");
      if (res.ok) {
        setBillingData(await res.json());
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const handleCheckout = async (tier: PaidTier, interval: "month" | "year") => {
    const key = `${tier}-${interval}`;
    setCheckoutLoading(key);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, interval }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      }
    } catch {
      /* ignore */
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (loading && !billingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!billingData) return null;

  const configItems = [
    { label: "Secret Key", ok: billingData.config.stripeSecretKey, hint: "STRIPE_SECRET_KEY" },
    { label: "Webhook Secret", ok: billingData.config.stripeWebhookSecret, hint: "STRIPE_WEBHOOK_SECRET" },
    { label: "Starter Monthly", ok: billingData.config.starterMonthlyPriceId, hint: "STRIPE_STARTER_MONTHLY_PRICE_ID" },
    { label: "Starter Annual", ok: billingData.config.starterAnnualPriceId, hint: "STRIPE_STARTER_ANNUAL_PRICE_ID" },
    { label: "Pro Monthly", ok: billingData.config.proMonthlyPriceId, hint: "STRIPE_PRO_MONTHLY_PRICE_ID" },
    { label: "Pro Annual", ok: billingData.config.proAnnualPriceId, hint: "STRIPE_PRO_ANNUAL_PRICE_ID" },
    { label: "Scale Monthly", ok: billingData.config.scaleMonthlyPriceId, hint: "STRIPE_SCALE_MONTHLY_PRICE_ID" },
    { label: "Scale Annual", ok: billingData.config.scaleAnnualPriceId, hint: "STRIPE_SCALE_ANNUAL_PRICE_ID" },
  ];

  const allPricesConfigured =
    billingData.config.starterMonthlyPriceId &&
    billingData.config.starterAnnualPriceId &&
    billingData.config.proMonthlyPriceId &&
    billingData.config.proAnnualPriceId &&
    billingData.config.scaleMonthlyPriceId &&
    billingData.config.scaleAnnualPriceId;

  return (
    <div className="space-y-6">
      {/* Stripe Configuration */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Stripe Configuration
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchBilling} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {configItems.map((item) => (
            <div key={item.label} className="flex items-start gap-2 text-sm">
              <div className="shrink-0 mt-0.5">
                {item.ok ? (
                  <CircleCheck className="h-4 w-4 text-emerald-500" />
                ) : (
                  <CircleX className="h-4 w-4 text-destructive" />
                )}
              </div>
              <div className="min-w-0">
                <span className="font-medium">{item.label}</span>
                <span className="text-muted-foreground hidden sm:inline"> — {item.hint}</span>
                <p className="text-xs text-muted-foreground truncate sm:hidden">{item.hint}</p>
              </div>
            </div>
          ))}
          {billingData.config.appUrl && (
            <div className="mt-3 border-t pt-3">
              <div className="text-xs text-muted-foreground">Webhook URL</div>
              <code className="text-xs text-foreground break-all">{billingData.config.appUrl}/api/billing/webhook</code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscriber stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{billingData.stats.paidUsers}</div>
            <div className="text-sm text-muted-foreground">Paid subscribers</div>
            {billingData.stats.paidUsers > 0 && (
              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                {billingData.stats.starterUsers > 0 && <span>{billingData.stats.starterUsers} Starter</span>}
                {billingData.stats.proUsers > 0 && <span>{billingData.stats.proUsers} Pro</span>}
                {billingData.stats.scaleUsers > 0 && <span>{billingData.stats.scaleUsers} Scale</span>}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{billingData.stats.trialUsers}</div>
            <div className="text-sm text-muted-foreground">On trial</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{billingData.stats.hobbyUsers}</div>
            <div className="text-sm text-muted-foreground">Hobby (free)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{billingData.stats.totalUsers}</div>
            <div className="text-sm text-muted-foreground">Total users</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Checkout */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Quick Checkout (test)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["starter", "pro", "scale"] as PaidTier[]).map((tier) => {
              const prices = TIER_PRICES[tier];
              const label = tier.charAt(0).toUpperCase() + tier.slice(1);
              return (
                <div key={tier} className="space-y-2 rounded-lg border border-border p-3">
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => handleCheckout(tier, "month")}
                      disabled={!!checkoutLoading || !allPricesConfigured}
                    >
                      {checkoutLoading === `${tier}-month` ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <ExternalLink className="mr-1 h-3 w-3" />
                      )}
                      ${prices.monthly}/mo
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => handleCheckout(tier, "year")}
                      disabled={!!checkoutLoading || !allPricesConfigured}
                    >
                      {checkoutLoading === `${tier}-year` ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <ExternalLink className="mr-1 h-3 w-3" />
                      )}
                      ${prices.annual}/yr
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {!allPricesConfigured && (
            <p className="mt-2 text-xs text-muted-foreground">
              Configure all Stripe price IDs above to enable checkout.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stripe Subscribers */}
      {billingData.stripeSubscribers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stripe Subscribers</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">User</th>
                    <th className="pb-2 pr-4 font-medium">Tier</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">Ends At</th>
                  </tr>
                </thead>
                <tbody>
                  {billingData.stripeSubscribers.map((sub) => (
                    <tr key={sub.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-4">
                        <div className="font-medium">{sub.name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{sub.email}</div>
                      </td>
                      <td className="py-2 pr-4">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {sub.subscriptionTier.charAt(0).toUpperCase() + sub.subscriptionTier.slice(1)}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            sub.subscriptionStatus === "active"
                              ? "bg-success/15 text-success-foreground"
                              : sub.subscriptionStatus === "past_due"
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-muted text-muted-foreground"
                          )}
                        >
                          {sub.subscriptionStatus}
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground whitespace-nowrap">
                        {sub.subscriptionEndsAt
                          ? new Date(sub.subscriptionEndsAt).toLocaleDateString("en-AU")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {billingData.stripeSubscribers.map((sub) => (
                <div key={sub.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {(sub.name || sub.email)?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{sub.name || "—"}</span>
                      <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        {sub.subscriptionTier.charAt(0).toUpperCase() + sub.subscriptionTier.slice(1)}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0",
                          sub.subscriptionStatus === "active"
                            ? "bg-success/15 text-success-foreground"
                            : sub.subscriptionStatus === "past_due"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        {sub.subscriptionStatus}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{sub.email}</div>
                    <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {sub.subscriptionEndsAt
                        ? `Ends ${new Date(sub.subscriptionEndsAt).toLocaleDateString("en-AU")}`
                        : "No end date"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Events */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Subscription Events</CardTitle>
        </CardHeader>
        <CardContent>
          {billingData.events.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No subscription events yet.</p>
          ) : (
            <>
              {/* Desktop: inline layout */}
              <div className="hidden md:block space-y-2">
                {billingData.events.map((evt) => (
                  <div key={evt.id} className="flex items-center gap-3 text-sm">
                    <span
                      className={cn(
                        "inline-flex h-5 min-w-[44px] items-center justify-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wider",
                        ["upgrade", "grant"].includes(evt.action)
                          ? "bg-success/15 text-success-foreground"
                          : ["cancel", "revoke", "failed"].includes(evt.action)
                            ? "bg-destructive/10 text-destructive-foreground"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {evt.action}
                    </span>
                    <span className="font-medium">{evt.user?.name || evt.user?.email || "Unknown"}</span>
                    {evt.detail && (
                      <span className="flex-1 truncate text-muted-foreground">{evt.detail}</span>
                    )}
                    <span className="shrink-0 text-xs text-muted-foreground/60 whitespace-nowrap">
                      {formatRelativeTime(evt.createdAt)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Mobile: stacked cards */}
              <div className="space-y-2 md:hidden">
                {billingData.events.map((evt) => (
                  <div key={evt.id} className="rounded-lg border border-border/50 p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex h-5 items-center justify-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wider",
                          ["upgrade", "grant"].includes(evt.action)
                            ? "bg-success/15 text-success-foreground"
                            : ["cancel", "revoke", "failed"].includes(evt.action)
                              ? "bg-destructive/10 text-destructive-foreground"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        {evt.action}
                      </span>
                      <span className="text-sm font-medium truncate">{evt.user?.name || evt.user?.email || "Unknown"}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground/60 shrink-0">
                        {formatRelativeTime(evt.createdAt)}
                      </span>
                    </div>
                    {evt.detail && (
                      <p className="mt-1 text-xs text-muted-foreground leading-snug">{evt.detail}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
