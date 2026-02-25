"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import type { BatchTier } from "@/lib/batch-pricing";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface BatchPricingSettingsProps {
  tiers: BatchTier[];
  onChange: (tiers: BatchTier[]) => void;
}

export function BatchPricingSettings({
  tiers,
  onChange,
}: BatchPricingSettingsProps) {
  const [localTiers, setLocalTiers] = useState<BatchTier[]>(tiers);

  function updateTier(index: number, field: keyof BatchTier, value: string) {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;

    const updated = [...localTiers];
    updated[index] = { ...updated[index], [field]: num };
    setLocalTiers(updated);
    onChange(updated);
  }

  function addTier() {
    const lastQty =
      localTiers.length > 0
        ? localTiers[localTiers.length - 1].minQty
        : 0;
    const lastPct =
      localTiers.length > 0
        ? localTiers[localTiers.length - 1].discountPct
        : 0;

    const updated = [
      ...localTiers,
      { minQty: lastQty + 10, discountPct: lastPct + 5 },
    ];
    setLocalTiers(updated);
    onChange(updated);
  }

  function removeTier(index: number) {
    const updated = localTiers.filter((_, i) => i !== index);
    setLocalTiers(updated);
    onChange(updated);
  }

  // Sync if parent tiers change
  if (JSON.stringify(tiers) !== JSON.stringify(localTiers) && tiers !== localTiers) {
    setLocalTiers(tiers);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Batch Pricing</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Offer automatic discounts for larger quantities.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={addTier}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Tier
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {localTiers.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No batch pricing tiers configured. Add a tier to offer quantity
            discounts.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-[1fr_1fr_auto] gap-3 text-xs font-medium text-muted-foreground">
              <span>Min Quantity</span>
              <span>Discount (%)</span>
              <span className="w-8" />
            </div>

            {/* Rows */}
            {localTiers.map((tier, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_1fr_auto] items-center gap-3"
              >
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={tier.minQty}
                  onChange={(e) => updateTier(index, "minQty", e.target.value)}
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={tier.discountPct}
                  onChange={(e) =>
                    updateTier(index, "discountPct", e.target.value)
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTier(index)}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}

            {/* Preview */}
            <div className="mt-4 rounded-md bg-muted/50 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Preview
              </p>
              <div className="space-y-1 text-sm">
                {localTiers
                  .sort((a, b) => a.minQty - b.minQty)
                  .map((tier, i) => (
                    <p key={i}>
                      {tier.minQty}+ units:{" "}
                      <span className="font-medium text-primary">
                        {tier.discountPct}% off
                      </span>
                    </p>
                  ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
