"use client";

import { useState, useMemo } from "react";
import { Calculator, ArrowRight } from "lucide-react";
import Link from "next/link";
import { calculateTotalCost, type CalculatorInput } from "@/lib/calculator";

// Hardcoded machine defaults (Bambu Lab X1C)
const MACHINE_DEFAULTS = {
  purchasePrice: 1899,
  lifetimeHours: 5000,
  powerWatts: 200,
  electricityRate: 0.3,
  maintenanceCostPerHour: 0.5,
};

interface SliderConfig {
  label: string;
  key: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit: string;
  prefix?: string;
}

const SLIDERS: SliderConfig[] = [
  { label: "Print weight", key: "weight", min: 10, max: 500, step: 5, defaultValue: 50, unit: "g" },
  { label: "Print time", key: "time", min: 0.5, max: 24, step: 0.5, defaultValue: 2, unit: "hrs" },
  { label: "Material cost", key: "materialCost", min: 15, max: 80, step: 1, defaultValue: 30, unit: "/kg", prefix: "$" },
  { label: "Labour time", key: "labour", min: 0, max: 120, step: 5, defaultValue: 30, unit: "min" },
  { label: "Shipping", key: "shipping", min: 0, max: 50, step: 1, defaultValue: 10, unit: "", prefix: "$" },
  { label: "Packaging", key: "packaging", min: 0, max: 20, step: 0.5, defaultValue: 2, unit: "", prefix: "$" },
  { label: "Markup", key: "markup", min: 0, max: 200, step: 5, defaultValue: 50, unit: "%" },
  { label: "Quantity", key: "quantity", min: 1, max: 100, step: 1, defaultValue: 1, unit: "pcs" },
];

function formatValue(slider: SliderConfig, value: number): string {
  if (slider.prefix) return `${slider.prefix}${value}`;
  return `${value}`;
}

export function CalculatorDemo() {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {};
    for (const s of SLIDERS) defaults[s.key] = s.defaultValue;
    return defaults;
  });

  const breakdown = useMemo(() => {
    const input: CalculatorInput = {
      material: {
        spoolPrice: values.materialCost,
        spoolWeightG: 1000,
        printWeightG: values.weight,
        supportWeightG: 0,
        wasteFactorPct: 10,
      },
      machine: {
        ...MACHINE_DEFAULTS,
        printTimeMinutes: values.time * 60,
      },
      labour: {
        designTimeMinutes: 0,
        designRate: 0,
        setupTimeMinutes: values.labour,
        postProcessingTimeMinutes: 0,
        packingTimeMinutes: 0,
        labourRate: 35,
      },
      overhead: {
        monthlyOverhead: 0,
        estimatedMonthlyJobs: 1,
      },
      pricing: {
        markupPct: values.markup,
        minimumCharge: 0,
        quantity: values.quantity,
        rushMultiplier: 1,
      },
      shipping: {
        shippingCostPerUnit: 0,
        packagingCostPerUnit: 0,
      },
    };
    return calculateTotalCost(input);
  }, [values]);

  // Shipping & packaging are separate from the core calculator — added on top
  const shippingCost = values.shipping * values.quantity;
  const packagingCost = values.packaging * values.quantity;
  const grandTotal = breakdown.totalPrice + shippingCost + packagingCost;

  const costComponents = [
    { label: "Material", value: breakdown.materialCost, colour: "bg-blue-500" },
    { label: "Machine", value: breakdown.machineCost, colour: "bg-violet-500" },
    { label: "Labour", value: breakdown.labourCost, colour: "bg-amber-500" },
    { label: "Shipping", value: shippingCost, colour: "bg-sky-500" },
    { label: "Packaging", value: packagingCost, colour: "bg-orange-500" },
    { label: "Markup", value: breakdown.markup, colour: "bg-emerald-500" },
  ];

  const subtotalForBar = costComponents.reduce((sum, c) => sum + c.value, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
          <Calculator className="h-3.5 w-3.5" />
          Interactive Demo
        </div>
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Try the calculator
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          See exactly what a 3D print costs — adjust the sliders and watch the
          breakdown update in real time.
        </p>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        {/* Sliders */}
        <div className="space-y-5">
          {SLIDERS.map((slider) => (
            <div key={slider.key}>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  {slider.label}
                </label>
                <span className="rounded-md bg-muted px-2.5 py-0.5 text-sm font-semibold tabular-nums text-foreground">
                  {formatValue(slider, values[slider.key])}
                  <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                    {slider.unit}
                  </span>
                </span>
              </div>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={values[slider.key]}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    [slider.key]: parseFloat(e.target.value),
                  }))
                }
                className="demo-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-muted transition-all focus:outline-none"
              />
              <div className="mt-1 flex justify-between text-[11px] text-muted-foreground/50">
                <span>{slider.prefix || ""}{slider.min}</span>
                <span>{slider.prefix || ""}{slider.max}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Cost Breakdown */}
        <div className="flex flex-col">
          <div className="flex-1 rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Cost Breakdown
            </h3>

            {/* Component rows */}
            <div className="mt-5 space-y-3">
              {costComponents.map((c) => (
                <div key={c.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${c.colour}`} />
                    <span className="text-sm text-muted-foreground">{c.label}</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    ${c.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Stacked bar */}
            <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-muted">
              {subtotalForBar > 0 &&
                costComponents.map((c) => {
                  const pct = (c.value / subtotalForBar) * 100;
                  if (pct <= 0) return null;
                  return (
                    <div
                      key={c.label}
                      className={`${c.colour} transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                      title={`${c.label}: ${pct.toFixed(0)}%`}
                    />
                  );
                })}
            </div>

            {/* Divider */}
            <div className="my-5 border-t border-border" />

            {/* Unit price */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Unit price</span>
              <span className="text-sm font-medium tabular-nums">
                ${breakdown.unitPrice.toFixed(2)}
              </span>
            </div>

            {values.quantity > 1 && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Quantity &times; {values.quantity}
                </span>
                <span className="text-sm font-medium tabular-nums">
                  ${(breakdown.unitPrice * values.quantity).toFixed(2)}
                </span>
              </div>
            )}

            {/* Total */}
            <div className="mt-4 flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
              <span className="text-base font-semibold text-foreground">
                Total Price
              </span>
              <span className="text-2xl font-extrabold tabular-nums text-primary">
                ${grandTotal.toFixed(2)}
              </span>
            </div>

            {/* Machine info footnote */}
            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground/60">
              Based on Bambu Lab X1C ($1,899 / 5,000 hr), electricity at $0.30/kWh,
              labour at $35/hr, 10% waste factor. Sign up to customise all parameters.
            </p>
          </div>

          {/* CTA */}
          <Link
            href="/register"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25"
          >
            Start Free Trial — Build Full Quotes
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
