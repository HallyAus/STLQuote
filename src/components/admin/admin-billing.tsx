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
    proUsers: number;
    trialUsers: number;
    freeUsers: number;
  };
  stripeSubscribers: {
    id: string;
    name: string | null;
    email: string | null;
    subscriptionTier: string;
    subscriptionStatus: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
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
    monthlyPriceId: string | null;
    annualPriceId: string | null;
    appUrl: string | null;
  };
}

export function AdminBilling() {
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

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

  const handleCheckout = async (interval: "month" | "year") => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      }
    } catch {
      /* ignore */
    } finally {
      setCheckoutLoading(false);
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
    { label: "Monthly Price ID", ok: !!billingData.config.monthlyPriceId, hint: billingData.config.monthlyPriceId || "STRIPE_PRO_MONTHLY_PRICE_ID — not set" },
    { label: "Annual Price ID", ok: !!billingData.config.annualPriceId, hint: billingData.config.annualPriceId || "STRIPE_PRO_ANNUAL_PRICE_ID — not set" },
  ];

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
            <div className="text-2xl font-bold">{billingData.stats.proUsers}</div>
            <div className="text-sm text-muted-foreground">Pro subscribers</div>
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
            <div className="text-2xl font-bold">{billingData.stats.freeUsers}</div>
            <div className="text-sm text-muted-foreground">Free users</div>
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
          <CardTitle className="text-sm font-medium text-muted-foreground">Quick Checkout</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => handleCheckout("month")}
              disabled={checkoutLoading || !billingData.config.monthlyPriceId}
            >
              {checkoutLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
              Monthly — $29/mo
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleCheckout("year")}
              disabled={checkoutLoading || !billingData.config.annualPriceId}
            >
              {checkoutLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
              Annual — $290/yr
            </Button>
          </div>
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
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Customer ID</th>
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
                      <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                        {sub.stripeCustomerId || "—"}
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
