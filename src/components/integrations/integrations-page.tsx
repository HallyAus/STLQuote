"use client";

import { Suspense } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { XeroSettings } from "@/components/settings/xero-settings";
import { ShopifySettings } from "@/components/integrations/shopify-settings";
import { GoogleDriveSettings } from "@/components/integrations/google-drive-settings";
import { OneDriveSettings } from "@/components/integrations/onedrive-settings";
import { AsanaSettings } from "@/components/integrations/asana-settings";
import { WebhookSettings } from "@/components/settings/webhook-settings";
import { CreditCard, MessageSquare, Gamepad2, Send, Cloud } from "lucide-react";

const comingSoon = [
  {
    name: "Stripe Connect",
    description: "Accept card payments directly from invoices.",
    icon: CreditCard,
  },
  {
    name: "Slack",
    description: "Get notifications for quotes, invoices, and jobs.",
    icon: MessageSquare,
  },
  {
    name: "Discord",
    description: "Send job updates and alerts to your Discord server.",
    icon: Gamepad2,
  },
  {
    name: "Telegram",
    description: "Get instant notifications via Telegram bot.",
    icon: Send,
  },
  {
    name: "Dropbox",
    description: "Sync files and exports to your Dropbox account.",
    icon: Cloud,
  },
];

export function IntegrationsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6 pt-4 md:pt-6 pb-4">
        <h2 className="text-lg font-semibold text-foreground">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Connect your favourite tools
        </p>
      </div>

      {/* Active integrations */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={null}>
          <XeroSettings />
        </Suspense>

        <Suspense fallback={null}>
          <ShopifySettings />
        </Suspense>

        <Suspense fallback={null}>
          <GoogleDriveSettings />
        </Suspense>

        <Suspense fallback={null}>
          <OneDriveSettings />
        </Suspense>

        <Suspense fallback={null}>
          <AsanaSettings />
        </Suspense>

        <WebhookSettings />
      </div>

      {/* Coming soon */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {comingSoon.map((integration) => (
          <Card key={integration.name} className="opacity-60">
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <integration.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">
                  {integration.name}
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
