"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BANNER } from "@/lib/status-colours";
import { Loader2, Unlink, Check, ExternalLink, Cloud, FolderPlus } from "lucide-react";

interface ConnectionStatus {
  connected: boolean;
  providerEmail: string | null;
  connectedAt: string | null;
  rootFolderId: string | null;
  lastSyncAt: string | null;
}

export function OneDriveSettings() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cloud/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data.onedrive ?? { connected: false, providerEmail: null, connectedAt: null, rootFolderId: null, lastSyncAt: null });
      } else {
        setStatus({ connected: false, providerEmail: null, connectedAt: null, rootFolderId: null, lastSyncAt: null });
      }
    } catch {
      setStatus({ connected: false, providerEmail: null, connectedAt: null, rootFolderId: null, lastSyncAt: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Handle ?onedrive= query param from OAuth callback
  useEffect(() => {
    const param = searchParams.get("onedrive");
    if (param === "connected") {
      setSuccess("OneDrive connected!");
      fetchStatus();
    } else if (param === "error") {
      const reason = searchParams.get("reason") ?? "unknown";
      const messages: Record<string, string> = {
        denied: "Microsoft authorisation was denied.",
        missing_params: "Missing parameters in callback.",
        state_mismatch: "Security state mismatch — please try again.",
        no_refresh_token: "No refresh token received. Please try again.",
        exchange_failed: "Failed to exchange authorisation code. Please try again.",
      };
      setError(messages[reason] ?? "Failed to connect to OneDrive.");
    }
  }, [searchParams, fetchStatus]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 5000);
    return () => clearTimeout(timer);
  }, [success]);

  async function handleDisconnect() {
    if (!confirm("Disconnect OneDrive? Synced files will remain in both locations.")) return;
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/cloud/onedrive/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("Failed to disconnect");
      setStatus({ connected: false, providerEmail: null, connectedAt: null, rootFolderId: null, lastSyncAt: null });
      setSuccess("OneDrive disconnected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleFolderSetup() {
    setSettingUp(true);
    setError(null);
    try {
      const res = await fetch("/api/cloud/folder-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "onedrive" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to set up folders");
      }
      setSuccess("Printforge folders created in OneDrive!");
      fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSettingUp(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Cloud className="h-5 w-5" /> OneDrive</CardTitle></CardHeader>
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
          <CardTitle className="flex items-center gap-2"><Cloud className="h-5 w-5" /> OneDrive</CardTitle>
          <Badge variant={isConnected ? "success" : "default"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className={BANNER.error}>{error}</div>}
        {success && (
          <div className={`flex items-center gap-2 ${BANNER.success}`}>
            <Check className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        {isConnected ? (
          <>
            <div className="rounded-lg border border-border p-4 space-y-2">
              {status?.providerEmail && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Account</span>
                  <span className="text-foreground">{status.providerEmail}</span>
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
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Folder Structure</span>
                <span className="text-foreground">
                  {status?.rootFolderId ? "Set up" : "Not set up"}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              {!status?.rootFolderId && (
                <Button onClick={handleFolderSetup} disabled={settingUp} variant="secondary">
                  {settingUp ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Setting up...</>
                  ) : (
                    <><FolderPlus className="mr-2 h-4 w-4" />Set Up Folders</>
                  )}
                </Button>
              )}
              <Button onClick={handleDisconnect} disabled={disconnecting} variant="ghost" className="text-destructive-foreground">
                {disconnecting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Disconnecting...</>
                ) : (
                  <><Unlink className="mr-2 h-4 w-4" />Disconnect</>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Connect your Microsoft OneDrive to import files into designs and export quotes and invoices as PDFs.
            </p>
            <a href="/api/cloud/onedrive/connect" className={buttonVariants({ variant: "primary" })}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Connect OneDrive
            </a>
          </>
        )}
      </CardContent>
    </Card>
  );
}
