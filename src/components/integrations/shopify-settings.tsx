"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BANNER } from "@/lib/status-colours";
import {
  Loader2,
  Unlink,
  RefreshCw,
  Check,
  ChevronDown,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShopifyStatus {
  connected: boolean;
  shopDomain: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  autoCreateJobs: boolean;
}

interface SyncResult {
  created: number;
  skipped: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShopifySettings() {
  const [status, setStatus] = useState<ShopifyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  // Connect form
  const [shopDomain, setShopDomain] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  // Setup instructions toggle
  const [showInstructions, setShowInstructions] = useState(false);

  // ---- Fetch status ----

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/shopify/status");
      if (res.ok) {
        setStatus(await res.json());
      } else {
        setStatus({ connected: false, shopDomain: null, connectedAt: null, lastSyncAt: null, autoCreateJobs: true });
      }
    } catch {
      setStatus({ connected: false, shopDomain: null, connectedAt: null, lastSyncAt: null, autoCreateJobs: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // ---- Clear success after delay ----

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 5000);
    return () => clearTimeout(timer);
  }, [success]);

  // ---- Connect ----

  async function handleConnect() {
    if (!shopDomain.trim() || !clientId.trim() || !clientSecret.trim()) return;
    setConnecting(true);
    setError(null);

    try {
      const res = await fetch("/api/shopify/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopDomain: shopDomain.trim(),
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to connect");
      }

      setSuccess("Shopify connected successfully!");
      setShopDomain("");
      setClientId("");
      setClientSecret("");
      fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  }

  // ---- Disconnect ----

  async function handleDisconnect() {
    if (!confirm("Disconnect from Shopify? This will stop automatic order syncing.")) return;
    setDisconnecting(true);
    setError(null);
    setSyncResult(null);

    try {
      const res = await fetch("/api/shopify/disconnect", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to disconnect");
      }
      setStatus({ connected: false, shopDomain: null, connectedAt: null, lastSyncAt: null, autoCreateJobs: true });
      setSuccess("Shopify disconnected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setDisconnecting(false);
    }
  }

  // ---- Sync ----

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const res = await fetch("/api/shopify/sync", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Sync failed");
      }
      const data: SyncResult = await res.json();
      setSyncResult(data);
      setSuccess(`Sync complete! Created ${data.created} job${data.created !== 1 ? "s" : ""}.`);
      fetchStatus(); // Refresh lastSyncAt
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  // ---- Toggle auto-create ----

  async function handleToggleAutoCreate() {
    if (!status) return;
    const newValue = !status.autoCreateJobs;

    try {
      const res = await fetch("/api/shopify/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoCreateJobs: newValue }),
      });
      if (res.ok) {
        setStatus((prev) => prev ? { ...prev, autoCreateJobs: newValue } : prev);
      }
    } catch {
      // Silently fail — user can retry
    }
  }

  // ---- Loading ----

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Shopify
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isConnected = status?.connected ?? false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Shopify
          </CardTitle>
          <Badge variant={isConnected ? "success" : "default"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error banner */}
        {error && <div className={BANNER.error}>{error}</div>}

        {/* Success banner */}
        {success && (
          <div className={`flex items-center gap-2 ${BANNER.success}`}>
            <Check className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        {isConnected ? (
          <>
            {/* Connection details */}
            <div className="rounded-lg border border-border p-4 space-y-2">
              {status?.shopDomain && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Store</span>
                  <span className="font-medium text-foreground">{status.shopDomain}</span>
                </div>
              )}
              {status?.connectedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Connected</span>
                  <span className="text-foreground">
                    {new Date(status.connectedAt).toLocaleDateString("en-AU", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              {status?.lastSyncAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last sync</span>
                  <span className="text-foreground">
                    {new Date(status.lastSyncAt).toLocaleDateString("en-AU", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Auto-create toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={status?.autoCreateJobs ?? true}
                onChange={handleToggleAutoCreate}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground">
                Auto-create jobs from new orders
              </span>
            </label>

            {/* Sync result */}
            {syncResult && (
              <div className={BANNER.info}>
                Pulled {syncResult.total} order{syncResult.total !== 1 ? "s" : ""} — created{" "}
                {syncResult.created} new job{syncResult.created !== 1 ? "s" : ""}
                {syncResult.skipped > 0 ? `, ${syncResult.skipped} already imported` : ""}.
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={handleSync} disabled={syncing} variant="secondary">
                {syncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Orders Now
                  </>
                )}
              </Button>
              <Button
                onClick={handleDisconnect}
                disabled={disconnecting}
                variant="ghost"
                className="text-destructive-foreground"
              >
                {disconnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <Unlink className="mr-2 h-4 w-4" />
                    Disconnect
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Connect your Shopify store to automatically pull orders in as jobs.
              You&apos;ll need to create a custom app in your Shopify admin.
            </p>

            {/* Setup instructions */}
            <button
              type="button"
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              {showInstructions ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              How to create a Shopify custom app
            </button>

            {showInstructions && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 text-sm text-muted-foreground">
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    Log in to your{" "}
                    <strong className="text-foreground">Shopify admin</strong> (e.g.{" "}
                    <code className="rounded bg-muted px-1 text-xs">your-store.myshopify.com/admin</code>)
                  </li>
                  <li>
                    Go to{" "}
                    <strong className="text-foreground">Settings → Apps and sales channels → Develop apps</strong>
                  </li>
                  <li>
                    If prompted, click{" "}
                    <strong className="text-foreground">Allow custom app development</strong> and confirm
                  </li>
                  <li>
                    Click{" "}
                    <strong className="text-foreground">Create an app</strong>. Name it{" "}
                    <code className="rounded bg-muted px-1 text-xs">Printforge</code>
                  </li>
                  <li>
                    Click{" "}
                    <strong className="text-foreground">Configure Admin API scopes</strong>
                  </li>
                  <li>
                    Search for and enable the{" "}
                    <code className="rounded bg-muted px-1 text-xs">read_orders</code>{" "}
                    scope. This is the only permission needed — Printforge will never modify your Shopify data
                  </li>
                  <li>
                    Click <strong className="text-foreground">Save</strong>, then click{" "}
                    <strong className="text-foreground">Install app</strong> and confirm the installation
                  </li>
                  <li>
                    Go to the{" "}
                    <strong className="text-foreground">API credentials</strong> tab
                  </li>
                  <li>
                    Copy the{" "}
                    <strong className="text-foreground">Client ID</strong> — it&apos;s shown under{" "}
                    <em>Client credentials</em>
                  </li>
                  <li>
                    Click{" "}
                    <strong className="text-foreground">Client secret → Reveal client secret once</strong>.{" "}
                    <span className="text-destructive-foreground font-medium">
                      Copy this immediately — it&apos;s only shown once!
                    </span>
                  </li>
                  <li>
                    Paste your store URL, client ID, and client secret in the fields below
                  </li>
                </ol>

                <p className="pt-2 text-xs text-muted-foreground/70">
                  Shopify uses short-lived tokens (24 hrs) — Printforge automatically refreshes them
                  using your client credentials. We&apos;re working on a simpler one-click OAuth
                  connection — coming in 1–2 months.
                </p>
              </div>
            )}

            {/* Connect form */}
            <div className="space-y-3">
              <Input
                label="Store URL"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                placeholder="your-store.myshopify.com"
              />
              <Input
                label="Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="e.g. 1a2b3c4d5e6f..."
              />
              <Input
                label="Client secret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="e.g. shpss_..."
              />
              <Button
                onClick={handleConnect}
                disabled={connecting || !shopDomain.trim() || !clientId.trim() || !clientSecret.trim()}
              >
                {connecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Connect to Shopify
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
