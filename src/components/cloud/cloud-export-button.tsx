"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Upload,
  HardDrive,
  Cloud,
  Check,
  ChevronDown,
} from "lucide-react";

interface CloudExportButtonProps {
  fileType: "design_file" | "quote_pdf" | "invoice_pdf";
  fileId: string;
}

interface ConnectionInfo {
  connected: boolean;
  providerEmail: string | null;
}

export function CloudExportButton({ fileType, fileId }: CloudExportButtonProps) {
  const [connections, setConnections] = useState<{
    google_drive: ConnectionInfo;
    onedrive: ConnectionInfo;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exported, setExported] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/cloud/status");
        if (res.ok) {
          const data = await res.json();
          setConnections({
            google_drive: data.google_drive,
            onedrive: data.onedrive,
          });
        }
      } catch {}
    }
    fetchStatus();
  }, []);

  const hasAny = connections?.google_drive?.connected || connections?.onedrive?.connected;

  if (!connections || !hasAny) return null;

  async function handleExport(provider: "google_drive" | "onedrive") {
    setExporting(provider);
    setError(null);
    setExported(null);

    try {
      const body: Record<string, string> = {
        provider,
        fileType,
        fileId,
      };

      const res = await fetch("/api/cloud/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Export failed");
      }

      setExported(provider);
      setTimeout(() => { setExported(null); setOpen(false); }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(!open)}
      >
        <Upload className="h-3.5 w-3.5 mr-1.5" />
        Export to Cloud
        <ChevronDown className="h-3.5 w-3.5 ml-1" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-border bg-background shadow-lg py-1">
            {error && (
              <div className="px-3 py-2 text-xs text-destructive-foreground bg-destructive/10 border-b border-border">
                {error}
              </div>
            )}

            {connections.google_drive?.connected && (
              <button
                onClick={() => handleExport("google_drive")}
                disabled={!!exporting}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
              >
                {exporting === "google_drive" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : exported === "google_drive" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <HardDrive className="h-4 w-4" />
                )}
                <span>{exported === "google_drive" ? "Exported!" : "Google Drive"}</span>
              </button>
            )}

            {connections.onedrive?.connected && (
              <button
                onClick={() => handleExport("onedrive")}
                disabled={!!exporting}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
              >
                {exporting === "onedrive" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : exported === "onedrive" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Cloud className="h-4 w-4" />
                )}
                <span>{exported === "onedrive" ? "Exported!" : "OneDrive"}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
