"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getEffectiveTier,
  isTrialActive,
  trialDaysRemaining,
} from "@/lib/tier";
import { Lock, ArrowRight } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UpgradePromptProps {
  feature: string;
  className?: string;
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UpgradePrompt({
  feature,
  className,
  compact = false,
}: UpgradePromptProps) {
  const { data: session } = useSession();
  const router = useRouter();

  // Don't render if user is already Pro
  const user = session?.user;
  if (!user) return null;

  const effectiveTier = getEffectiveTier({
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus,
    trialEndsAt: user.trialEndsAt,
  });

  if (effectiveTier === "pro") return null;

  const trialing =
    user.subscriptionStatus === "trialing" && isTrialActive(user.trialEndsAt);
  const daysLeft = trialDaysRemaining(user.trialEndsAt);

  function handleUpgrade() {
    router.push("/settings?tab=billing");
  }

  // ---- Compact variant: inline banner ----

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-2.5",
          className
        )}
      >
        <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-foreground">
            <span className="font-medium">{feature}</span> requires{" "}
            <Badge variant="success" size="sm">
              Pro
            </Badge>
          </span>
          {trialing && (
            <span className="ml-1.5 text-xs text-muted-foreground">
              — trial ends in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <Button size="sm" onClick={handleUpgrade}>
          Upgrade
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    );
  }

  // ---- Full variant: card ----

  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>

        <Badge variant="success" className="mt-4">
          Pro Feature
        </Badge>

        <h3 className="mt-3 text-base font-semibold text-foreground">
          {feature}
        </h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {feature} requires a Pro subscription. Upgrade to unlock this and all
          other Pro features.
        </p>

        {trialing && (
          <p className="mt-2 text-xs text-warning-foreground">
            You&apos;re on a trial — upgrade to keep access after it ends
            ({daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining)
          </p>
        )}

        <Button className="mt-4" onClick={handleUpgrade}>
          Upgrade to Pro
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
