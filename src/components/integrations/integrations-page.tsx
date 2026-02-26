"use client";

import { Suspense } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { XeroSettings } from "@/components/settings/xero-settings";
import { CreditCard, ShoppingBag, MessageSquare } from "lucide-react";

const comingSoon = [
  {
    name: "Stripe Connect",
    description: "Accept card payments directly from invoices.",
    icon: CreditCard,
  },
  {
    name: "Shopify",
    description: "Sync orders from your Shopify storefront.",
    icon: ShoppingBag,
  },
  {
    name: "Slack",
    description: "Get notifications for quotes, invoices, and jobs.",
    icon: MessageSquare,
  },
];

export function IntegrationsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Connect your favourite tools
        </p>
      </div>

      {/* Xero */}
      <Suspense fallback={null}>
        <XeroSettings />
      </Suspense>

      {/* Coming soon */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {comingSoon.map((integration) => (
          <Card key={integration.name} className="opacity-60">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <integration.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-sm font-medium">
                  {integration.name}
                </CardTitle>
              </div>
              <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                Coming soon
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {integration.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
