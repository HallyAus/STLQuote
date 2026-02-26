"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BANNER } from "@/lib/status-colours";
import { Loader2, Unlink, RefreshCw, Check, ExternalLink } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface XeroStatus {
  connected: boolean;
  tenantId: string | null;
  connectedAt: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function XeroSettings() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<XeroStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{
    contacts: number;
    invoices: number;
  } | null>(null);

  // ---- Fetch Xero connection status ----

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/xero/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      } else {
        // 403 = feature not available, other = error — either way show disconnected
        setStatus({ connected: false, tenantId: null, connectedAt: null });
      }
    } catch {
      setStatus({ connected: false, tenantId: null, connectedAt: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ---- Handle ?xero= query param from OAuth callback ----

  useEffect(() => {
    const xeroParam = searchParams.get("xero");
    if (xeroParam === "connected") {
      setSuccess("Xero connected successfully!");
      setStatus({ connected: true, tenantId: null, connectedAt: new Date().toISOString() });
      // Re-fetch to get actual tenant info
      fetchStatus();
    } else if (xeroParam === "error") {
      const reason = searchParams.get("reason") ?? "unknown";
      const messages: Record<string, string> = {
        denied: "Xero authorisation was denied.",
        missing_params: "Missing parameters in callback.",
        state_mismatch: "Security state mismatch — please try again.",
        no_tenants: "No Xero organisations found on your account.",
        exchange_failed: "Failed to exchange authorisation code. Please try again.",
      };
      setError(messages[reason] ?? "Failed to connect to Xero.");
    }
  }, [searchParams, fetchStatus]);

  // ---- Clear success message after delay ----

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 5000);
    return () => clearTimeout(timer);
  }, [success]);

  // ---- Disconnect ----

  async function handleDisconnect() {
    if (!confirm("Disconnect from Xero? This will remove the connection but won't delete any data in Xero.")) {
      return;
    }

    setDisconnecting(true);
    setError(null);
    setSyncResult(null);

    try {
      const res = await fetch("/api/xero/disconnect", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to disconnect");
      }

      setStatus({ connected: false, tenantId: null, connectedAt: null });
      setSuccess("Xero disconnected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
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
      const res = await fetch("/api/xero/sync", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Sync failed");
      }

      const data = await res.json();
      setSyncResult(data.synced);

      const errorCount =
        (data.errors?.contacts?.length ?? 0) +
        (data.errors?.invoices?.length ?? 0);

      if (errorCount > 0) {
        setError(`Sync completed with ${errorCount} error(s). Check console for details.`);
      } else {
        setSuccess("Sync complete!");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSyncing(false);
    }
  }

  // ---- Loading ----

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Xero Integration</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // ---- Render ----

  const isConnected = status?.connected ?? false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Xero Integration</CardTitle>
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
              {status?.tenantId && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tenant ID</span>
                  <code className="truncate max-w-[200px] rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                    {status.tenantId}
                  </code>
                </div>
              )}
              {status?.connectedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Connected</span>
                  <span className="text-foreground">
                    {new Date(status.connectedAt).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Sync result */}
            {syncResult && (
              <div className={BANNER.info}>
                Synced {syncResult.contacts} contact{syncResult.contacts !== 1 ? "s" : ""} and{" "}
                {syncResult.invoices} invoice{syncResult.invoices !== 1 ? "s" : ""} to Xero.
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
                    Sync Now
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
              Connect your Xero account to automatically sync contacts, invoices,
              and payments. Your data stays in Printforge — Xero receives a copy.
            </p>
            <a
              href="/api/xero/connect"
              className={buttonVariants({ variant: "primary" })}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Connect to Xero
            </a>
          </>
        )}
      </CardContent>
    </Card>
  );
}
