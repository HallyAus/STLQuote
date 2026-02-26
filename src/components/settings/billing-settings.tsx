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
  PRO_FEATURE_LIST,
} from "@/lib/tier";
import {
  Check,
  CreditCard,
  ExternalLink,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BillingInterval = "month" | "year";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTHLY_PRICE = 29;
const ANNUAL_PRICE = 290;
const ANNUAL_MONTHLY_EQUIVALENT = Math.round((ANNUAL_PRICE / 12) * 100) / 100;
const ANNUAL_SAVINGS_PCT = Math.round(
  ((MONTHLY_PRICE * 12 - ANNUAL_PRICE) / (MONTHLY_PRICE * 12)) * 100
);

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

  const [interval, setInterval] = useState<BillingInterval>("month");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Handle billing=success / billing=cancel URL params
  useEffect(() => {
    const billing = searchParams.get("billing");
    if (billing === "success") {
      toast("Subscription activated! Welcome to Pro.", "success");
      // Clean the URL without triggering a full navigation
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
  const isPro = effectiveTier === "pro";
  const isActive = user.subscriptionStatus === "active";
  const isPastDue = user.subscriptionStatus === "past_due";
  const isCancelled = user.subscriptionStatus === "cancelled";

  // User has been through Stripe if they have an active/past_due/cancelled status
  const hasStripeCustomer = isActive || isPastDue || isCancelled;

  // ---- Handlers ----

  async function handleCheckout() {
    try {
      setCheckoutLoading(true);
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
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
      setCheckoutLoading(false);
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
              <Badge variant={isPro ? "success" : "default"}>
                {isPro ? "Pro" : "Free"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {trialing
                ? `Trial — ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`
                : isActive
                  ? "Your Pro subscription is active"
                  : isPastDue
                    ? "Payment issue — please update your payment method"
                    : isCancelled
                      ? "Cancelled — access continues until the end of your billing period"
                      : "Upgrade to unlock all features"}
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

        {/* Pricing toggle + upgrade (only show if not active Pro) */}
        {!isActive && (
          <div className="space-y-4">
            {/* Monthly / Annual toggle */}
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
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
                  Save {ANNUAL_SAVINGS_PCT}%
                </Badge>
              </button>
            </div>

            {/* Price display */}
            <div className="text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-foreground">
                  ${interval === "month" ? MONTHLY_PRICE : ANNUAL_PRICE}
                </span>
                <span className="text-sm text-muted-foreground">
                  /{interval === "month" ? "mo" : "yr"}
                </span>
              </div>
              {interval === "year" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  ${ANNUAL_MONTHLY_EQUIVALENT}/mo billed annually
                </p>
              )}
            </div>

            {/* Upgrade button */}
            <Button
              className="w-full"
              onClick={handleCheckout}
              loading={checkoutLoading}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Upgrade to Pro
            </Button>
          </div>
        )}

        {/* Manage subscription (only if user has been through Stripe) */}
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

        {/* Feature checklist */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">
            Everything in Pro
          </h4>
          <ul className="space-y-1.5">
            {PRO_FEATURE_LIST.map((item) => (
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
      return <Badge variant="default">Free</Badge>;
  }
}
