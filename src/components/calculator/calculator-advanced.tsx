"use client";

import { useState } from "react";
import { type CalculatorInput } from "@/lib/calculator";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronDown, Settings } from "lucide-react";

interface CalculatorAdvancedProps {
  input: CalculatorInput;
  onFieldChange: <
    S extends keyof CalculatorInput,
    K extends keyof CalculatorInput[S],
  >(section: S, key: K) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface FieldGroupProps {
  title: string;
  accentColour: string;
  children: React.ReactNode;
}

function FieldGroup({ title, accentColour, children }: FieldGroupProps) {
  return (
    <div className={cn("space-y-3 border-l-2 pl-4", accentColour)}>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

export function CalculatorAdvanced({
  input,
  onFieldChange,
}: CalculatorAdvancedProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card/50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Settings className="h-3.5 w-3.5" />
        <span className="font-medium">Advanced Settings</span>
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="space-y-6 border-t border-border px-4 py-5">
          {/* Material Details */}
          <FieldGroup title="Material Details" accentColour="border-l-chart-1">
            <Input
              label="Spool price (AUD)"
              hint="Cost per spool of filament"
              type="number"
              step="0.01"
              value={input.material.spoolPrice}
              onChange={onFieldChange("material", "spoolPrice")}
            />
            <Input
              label="Spool weight (g)"
              hint="Net filament weight per spool (typically 1000g)"
              type="number"
              step="1"
              value={input.material.spoolWeightG}
              onChange={onFieldChange("material", "spoolWeightG")}
            />
            <Input
              label="Support weight (g)"
              hint="Weight of support material used"
              type="number"
              step="0.1"
              value={input.material.supportWeightG}
              onChange={onFieldChange("material", "supportWeightG")}
            />
            <Input
              label="Waste factor (%)"
              hint="Account for failed prints and purging (typically 5-15%)"
              type="number"
              step="1"
              value={input.material.wasteFactorPct}
              onChange={onFieldChange("material", "wasteFactorPct")}
            />
          </FieldGroup>

          {/* Machine Details */}
          <FieldGroup title="Machine Details" accentColour="border-l-chart-2">
            <Input
              label="Purchase price ($)"
              hint="Original purchase price of the printer"
              type="number"
              step="1"
              value={input.machine.purchasePrice}
              onChange={onFieldChange("machine", "purchasePrice")}
            />
            <Input
              label="Lifetime hours"
              hint="Expected total operational hours before replacement"
              type="number"
              step="1"
              value={input.machine.lifetimeHours}
              onChange={onFieldChange("machine", "lifetimeHours")}
            />
            <Input
              label="Power (watts)"
              hint="Average power consumption during printing"
              type="number"
              step="1"
              value={input.machine.powerWatts}
              onChange={onFieldChange("machine", "powerWatts")}
            />
            <Input
              label="Electricity rate ($/kWh)"
              hint="Your electricity cost per kilowatt-hour"
              type="number"
              step="0.01"
              value={input.machine.electricityRate}
              onChange={onFieldChange("machine", "electricityRate")}
            />
            <Input
              label="Maintenance ($/hr)"
              hint="Nozzle replacements, belts, and other upkeep costs per hour"
              type="number"
              step="0.01"
              value={input.machine.maintenanceCostPerHour}
              onChange={onFieldChange("machine", "maintenanceCostPerHour")}
            />
          </FieldGroup>

          {/* Labour */}
          <FieldGroup title="Labour" accentColour="border-l-chart-4">
            <Input
              label="Design time (min)"
              hint="Time spent on CAD or design work for this job"
              type="number"
              step="1"
              value={input.labour.designTimeMinutes}
              onChange={onFieldChange("labour", "designTimeMinutes")}
            />
            <Input
              label="Design rate ($/hr)"
              hint="Hourly rate for design work"
              type="number"
              step="0.01"
              value={input.labour.designRate}
              onChange={onFieldChange("labour", "designRate")}
            />
            <Input
              label="Setup time (min)"
              hint="Bed prep, slicing, and print setup"
              type="number"
              step="1"
              value={input.labour.setupTimeMinutes}
              onChange={onFieldChange("labour", "setupTimeMinutes")}
            />
            <Input
              label="Post-processing (min)"
              hint="Support removal, sanding, painting, etc."
              type="number"
              step="1"
              value={input.labour.postProcessingTimeMinutes}
              onChange={onFieldChange("labour", "postProcessingTimeMinutes")}
            />
            <Input
              label="Packing time (min)"
              hint="Time to pack and prepare for shipping"
              type="number"
              step="1"
              value={input.labour.packingTimeMinutes}
              onChange={onFieldChange("labour", "packingTimeMinutes")}
            />
            <Input
              label="Labour rate ($/hr)"
              hint="Hourly rate for hands-on labour"
              type="number"
              step="0.01"
              value={input.labour.labourRate}
              onChange={onFieldChange("labour", "labourRate")}
            />
          </FieldGroup>

          {/* Overhead */}
          <FieldGroup title="Overhead" accentColour="border-l-chart-3">
            <Input
              label="Monthly overhead ($)"
              hint="Rent, insurance, subscriptions, and other fixed monthly costs"
              type="number"
              step="1"
              value={input.overhead.monthlyOverhead}
              onChange={onFieldChange("overhead", "monthlyOverhead")}
            />
            <Input
              label="Monthly jobs"
              hint="Estimated number of jobs per month to spread overhead across"
              type="number"
              step="1"
              value={input.overhead.estimatedMonthlyJobs}
              onChange={onFieldChange("overhead", "estimatedMonthlyJobs")}
            />
          </FieldGroup>

          {/* Shipping & Packaging */}
          <FieldGroup title="Shipping & Packaging" accentColour="border-l-sky-500">
            <Input
              label="Shipping per unit ($)"
              hint="Flat shipping cost charged per unit"
              type="number"
              step="0.50"
              min="0"
              value={input.shipping?.shippingCostPerUnit ?? 0}
              onChange={onFieldChange("shipping", "shippingCostPerUnit")}
            />
            <Input
              label="Packaging per unit ($)"
              hint="Boxes, tape, bubble wrap, and other packaging materials"
              type="number"
              step="0.50"
              min="0"
              value={input.shipping?.packagingCostPerUnit ?? 0}
              onChange={onFieldChange("shipping", "packagingCostPerUnit")}
            />
          </FieldGroup>

          {/* Pricing Extras */}
          <FieldGroup title="Pricing Extras" accentColour="border-l-primary">
            <Input
              label="Minimum charge ($)"
              hint="Floor price — no job will be quoted below this amount"
              type="number"
              step="0.01"
              value={input.pricing.minimumCharge}
              onChange={onFieldChange("pricing", "minimumCharge")}
            />
            <Input
              label="Rush multiplier"
              hint="Multiplier for urgent jobs (1.0 = no surcharge, 1.5 = 50% extra)"
              type="number"
              step="0.1"
              min="1"
              value={input.pricing.rushMultiplier}
              onChange={onFieldChange("pricing", "rushMultiplier")}
            />
          </FieldGroup>
        </div>
      )}
    </div>
  );
}
