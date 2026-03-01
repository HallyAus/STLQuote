"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type BillingInterval = "month" | "year";

interface TierPlan {
  name: string;
  monthly: number;
  annual: number;
  description: string;
  cta: string;
  ctaVariant: "outline" | "primary";
  popular?: boolean;
  features: string[];
}

const PLANS: TierPlan[] = [
  {
    name: "Hobby",
    monthly: 0,
    annual: 0,
    description: "Core tools to get started. Perfect for makers and side projects.",
    cta: "Get started free",
    ctaVariant: "outline",
    features: [
      "Cost calculator + presets",
      "Up to 10 quotes + PDF download",
      "Up to 3 printers, 5 materials",
      "Up to 10 clients",
      "Job tracking (kanban + calendar)",
      "Customer upload links",
      "STL & G-code upload",
      "Quote templates",
    ],
  },
  {
    name: "Starter",
    monthly: 12,
    annual: 108,
    description: "Unlimited core features plus business essentials.",
    cta: "Start free trial",
    ctaVariant: "outline",
    features: [
      "Everything in Hobby (no limits)",
      "Send quotes via email",
      "Client portal (shareable links)",
      "Business logo on PDFs",
      "CSV export",
      "Job photos",
      "Dashboard analytics",
      "Bulk actions",
    ],
  },
  {
    name: "Pro",
    monthly: 24,
    annual: 216,
    description: "Full operations — invoicing, AI, and supplier management.",
    cta: "Start free trial",
    ctaVariant: "primary",
    popular: true,
    features: [
      "Everything in Starter",
      "Invoicing with PDF & email",
      "AI Quote Assistant (Claude)",
      "Part Drawings with dimensions",
      "Suppliers & consumables",
      "Webhooks",
    ],
  },
  {
    name: "Scale",
    monthly: 49,
    annual: 468,
    description: "Full platform with integrations, AI studio, and cloud storage.",
    cta: "Start free trial",
    ctaVariant: "outline",
    features: [
      "Everything in Pro",
      "Shopify integration",
      "Xero accounting sync",
      "Design Studio with AI",
      "Cloud Storage (Drive, OneDrive)",
      "Master backup to OneDrive",
      "Asana integration",
    ],
  },
];

export function PricingCards() {
  const [interval, setInterval] = useState<BillingInterval>("year");

  const savingsPct = Math.round(
    ((PLANS[2].monthly * 12 - PLANS[2].annual) / (PLANS[2].monthly * 12)) * 100
  );

  return (
    <div className="mt-12">
      {/* Annual / Monthly toggle */}
      <div className="flex items-center justify-center gap-1">
        <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setInterval("year")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              interval === "year"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Annual
            <span className="ml-1.5 inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success-foreground">
              Save {savingsPct}%
            </span>
          </button>
          <button
            onClick={() => setInterval("month")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              interval === "month"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="mx-auto mt-10 grid max-w-6xl gap-6 lg:grid-cols-4 md:grid-cols-2">
        {PLANS.map((plan) => {
          const price = interval === "month" ? plan.monthly : plan.annual;
          const perMonth = interval === "year" && plan.annual > 0
            ? Math.round((plan.annual / 12) * 100) / 100
            : null;

          return (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-7",
                plan.popular
                  ? "border-2 border-primary shadow-xl shadow-primary/5"
                  : "border-border"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-6 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  <Crown className="h-3 w-3" />
                  Most Popular
                </div>
              )}

              <h3 className="text-lg font-semibold">{plan.name}</h3>

              <div className="mt-4 flex items-baseline gap-1">
                {plan.monthly === 0 ? (
                  <>
                    <span className="text-4xl font-extrabold tracking-tight">$0</span>
                    <span className="text-muted-foreground">/forever</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-extrabold tracking-tight">
                      ${interval === "month" ? plan.monthly : perMonth}
                    </span>
                    <span className="text-muted-foreground">/mo</span>
                  </>
                )}
              </div>

              {plan.monthly > 0 && interval === "year" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  ${plan.annual}/yr billed annually
                </p>
              )}
              {plan.monthly > 0 && interval === "month" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  or ${plan.annual}/yr billed annually
                </p>
              )}

              <p className="mt-3 text-sm text-muted-foreground">
                {plan.description}
              </p>

              <Link
                href="/register"
                className={cn(
                  "mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                  plan.ctaVariant === "primary"
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-xl"
                    : "border border-border bg-card text-foreground hover:bg-accent"
                )}
              >
                {plan.ctaVariant === "primary" && (
                  <Sparkles className="h-4 w-4" />
                )}
                {plan.cta}
              </Link>

              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        plan.popular ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
