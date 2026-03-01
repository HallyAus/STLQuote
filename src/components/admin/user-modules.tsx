"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, ToggleLeft, ToggleRight, Minus } from "lucide-react";

interface FeatureState {
  feature: string;
  label: string;
  description: string;
  tierDefault: boolean;
  override: string | null;
  effectiveAccess: boolean;
}

interface UserModulesProps {
  userId: string;
}

export function UserModules({ userId }: UserModulesProps) {
  const [features, setFeatures] = useState<FeatureState[]>([]);
  const [tier, setTier] = useState<string>("hobby");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/users/${userId}/modules`)
      .then((res) => res.json())
      .then((data) => {
        setFeatures(data.features ?? []);
        setTier(data.tier ?? "free");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  async function cycleOverride(feature: string, currentOverride: string | null) {
    setUpdating(feature);
    // Cycle: null → enabled → disabled → null
    let nextOverride: string | null;
    if (currentOverride === null) nextOverride = "enabled";
    else if (currentOverride === "enabled") nextOverride = "disabled";
    else nextOverride = null;

    try {
      const res = await fetch(`/api/admin/users/${userId}/modules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature, override: nextOverride }),
      });
      if (res.ok) {
        setFeatures((prev) =>
          prev.map((f) => {
            if (f.feature !== feature) return f;
            const tierDefault = f.tierDefault;
            const effectiveAccess = nextOverride === "enabled" ? true : nextOverride === "disabled" ? false : tierDefault;
            return { ...f, override: nextOverride, effectiveAccess };
          })
        );
      }
    } catch {
      // ignore
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Feature Modules
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            (Tier: {tier})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {features.map((f) => (
            <div
              key={f.feature}
              className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{f.label}</span>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      f.effectiveAccess
                        ? "bg-success/15 text-success-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {f.effectiveAccess ? "On" : "Off"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{f.description}</p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <span className="text-[10px] text-muted-foreground w-16 text-right">
                  {f.override === null
                    ? "Tier default"
                    : f.override === "enabled"
                      ? "Force on"
                      : "Force off"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => cycleOverride(f.feature, f.override)}
                  disabled={updating === f.feature}
                  title="Cycle: Tier Default → Force On → Force Off"
                >
                  {updating === f.feature ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : f.override === null ? (
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  ) : f.override === "enabled" ? (
                    <ToggleRight className="h-4 w-4 text-success-foreground" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 text-destructive-foreground" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
