"use client";

import { Suspense, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  getEffectiveTier,
  isTrialActive,
  trialDaysRemaining,
  TIER_LABELS,
  FEATURE_LIST,
  TIER_RANK,
  type Tier,
} from "@/lib/tier";
import {
  Check,
  CreditCard,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  Crown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BillingInterval = "month" | "year";
type PaidTier = "starter" | "pro" | "scale";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIER_PRICING: Record<PaidTier, { monthly: number; annual: number }> = {
  starter: { monthly: 12, annual: 108 },
  pro: { monthly: 24, annual: 216 },
  scale: { monthly: 49, annual: 468 },
};

const TIER_DESCRIPTIONS: Record<PaidTier, string> = {
  starter: "Unlimited core + business essentials",
  pro: "Invoicing, AI, suppliers, webhooks",
  scale: "Full platform + integrations",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BillingSettings() {
  return (
    <Suspense fallback={null}>
      <BillingSettingsInner />
    </Suspense>
  );
}

function BillingSettingsInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [interval, setInterval] = useState<BillingInterval>("year");
  const [checkoutLoading, setCheckoutLoading] = useState<PaidTier | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Handle billing=success / billing=cancel URL params
  useEffect(() => {
    const billing = searchParams.get("billing");
    if (billing === "success") {
      toast("Subscription activated! Welcome aboard.", "success");
      window.history.replaceState({}, "", "/settings");
    } else if (billing === "cancel") {
      toast("Checkout cancelled. No changes made.", "default");
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams, toast]);

  if (!session?.user) return null;

  const user = session.user;
  const effectiveTier = getEffectiveTier({
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus,
    trialEndsAt: user.trialEndsAt,
    role: user.role,
  });
  const trialing =
    user.subscriptionStatus === "trialing" && isTrialActive(user.trialEndsAt);
  const daysLeft = trialDaysRemaining(user.trialEndsAt);
  const isActive = user.subscriptionStatus === "active";
  const isPastDue = user.subscriptionStatus === "past_due";
  const isCancelled = user.subscriptionStatus === "cancelled";
  const hasStripeCustomer = isActive || isPastDue || isCancelled;

  // ---- Handlers ----

  async function handleCheckout(tier: PaidTier) {
    try {
      setCheckoutLoading(tier);
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, interval }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to start checkout");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to start checkout",
        "error"
      );
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handlePortal() {
    try {
      setPortalLoading(true);
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to open billing portal");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to open billing portal",
        "error"
      );
    } finally {
      setPortalLoading(false);
    }
  }

  // ---- Render ----

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Subscription</CardTitle>
          <StatusBadge
            status={user.subscriptionStatus}
            trialing={trialing}
            daysLeft={daysLeft}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current plan summary */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                Current plan
              </span>
              <Badge variant={effectiveTier !== "hobby" ? "success" : "default"}>
                {TIER_LABELS[effectiveTier]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {trialing
                ? `Trial — ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`
                : isActive
                  ? `Your ${TIER_LABELS[effectiveTier]} subscription is active`
                  : isPastDue
                    ? "Payment issue — please update your payment method"
                    : isCancelled
                      ? "Cancelled — access continues until the end of your billing period"
                      : "Upgrade to unlock more features"}
            </p>
          </div>
        </div>

        {/* Past due warning */}
        {isPastDue && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Your last payment failed. Please update your payment method to
              avoid losing access.
            </span>
          </div>
        )}

        {/* Pricing toggle + tier cards (show if not already active paid) */}
        {!isActive && (
          <div className="space-y-4">
            {/* Monthly / Annual toggle */}
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              <button
                onClick={() => setInterval("year")}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  interval === "year"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Annual
                <Badge variant="success" size="sm" className="ml-1.5">
                  Save 25%
                </Badge>
              </button>
              <button
                onClick={() => setInterval("month")}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  interval === "month"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Monthly
              </button>
            </div>

            {/* Tier cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              {(["starter", "pro", "scale"] as PaidTier[]).map((tier) => {
                const pricing = TIER_PRICING[tier];
                const price = interval === "month" ? pricing.monthly : pricing.annual;
                const perMonth = interval === "year"
                  ? Math.round((pricing.annual / 12) * 100) / 100
                  : pricing.monthly;
                const isCurrentTier = effectiveTier === tier && isActive;
                const isUpgrade = TIER_RANK[tier as Tier] > TIER_RANK[effectiveTier];
                const isPro = tier === "pro";

                return (
                  <div
                    key={tier}
                    className={cn(
                      "relative rounded-xl border p-4",
                      isPro
                        ? "border-2 border-primary shadow-md"
                        : "border-border"
                    )}
                  >
                    {isPro && (
                      <div className="absolute -top-2.5 left-3 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground">
                        <Crown className="h-2.5 w-2.5" />
                        Popular
                      </div>
                    )}
                    <p className="text-sm font-semibold">{TIER_LABELS[tier]}</p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-bold">${perMonth}</span>
                      <span className="text-xs text-muted-foreground">/mo</span>
                    </div>
                    {interval === "year" && (
                      <p className="text-[11px] text-muted-foreground">
                        ${price}/yr billed annually
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {TIER_DESCRIPTIONS[tier]}
                    </p>
                    <Button
                      size="sm"
                      variant={isPro ? "primary" : "secondary"}
                      className="mt-3 w-full"
                      onClick={() => handleCheckout(tier)}
                      loading={checkoutLoading === tier}
                      disabled={isCurrentTier || checkoutLoading !== null}
                    >
                      {isCurrentTier ? "Current plan" : isUpgrade ? "Upgrade" : "Switch"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Manage subscription (if user has been through Stripe) */}
        {hasStripeCustomer && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={handlePortal}
            loading={portalLoading}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Manage Subscription
          </Button>
        )}

        {/* Feature checklist — show features for current tier and above */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">
            Features included in {TIER_LABELS[effectiveTier]}
          </h4>
          <ul className="space-y-1.5">
            {FEATURE_LIST.filter(
              (item) => TIER_RANK[item.tier] <= TIER_RANK[effectiveTier]
            ).map((item) => (
              <li
                key={item.feature}
                className="flex items-start gap-2 text-sm"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-foreground" />
                <div>
                  <span className="font-medium text-foreground">
                    {item.label}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    — {item.description}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({
  status,
  trialing,
  daysLeft,
}: {
  status: string;
  trialing: boolean;
  daysLeft: number;
}) {
  if (trialing) {
    return (
      <Badge variant="warning">
        Trial — {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
      </Badge>
    );
  }

  switch (status) {
    case "active":
      return <Badge variant="success">Active</Badge>;
    case "past_due":
      return <Badge variant="destructive">Past Due</Badge>;
    case "cancelled":
      return <Badge variant="warning">Cancelled</Badge>;
    case "inactive":
      return <Badge variant="default">Inactive</Badge>;
    default:
      return <Badge variant="default">Hobby</Badge>;
  }
}
