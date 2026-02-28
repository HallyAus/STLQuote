"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { CheckSquare, Loader2, ExternalLink } from "lucide-react";

interface AsanaStatus {
  connected: boolean;
  connectedAt?: string;
  workspaceGid?: string;
  workspaceName?: string;
  projectGid?: string | null;
  projectName?: string | null;
  autoCreateTasks?: boolean;
  projects?: { gid: string; name: string }[];
}

export function AsanaSettings() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<AsanaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/asana/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Not critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Handle OAuth callback messages
  useEffect(() => {
    const provider = searchParams.get("provider");
    const callbackStatus = searchParams.get("status");
    if (provider !== "asana") return;

    if (callbackStatus === "connected") {
      setSuccess("Asana connected successfully!");
      fetchStatus();
    } else if (callbackStatus === "error") {
      const reason = searchParams.get("reason");
      const messages: Record<string, string> = {
        denied: "You denied access to Asana.",
        state_mismatch: "Security validation failed. Please try again.",
        exchange_failed: "Failed to connect. Check your Asana credentials.",
        not_authenticated: "Please log in first.",
      };
      setError(messages[reason || ""] || "Connection failed. Please try again.");
    }

    // Clear after 5s
    const timer = setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [searchParams, fetchStatus]);

  async function handleDisconnect() {
    if (!confirm("Disconnect Asana? Auto-created tasks won't be affected.")) return;
    try {
      const res = await fetch("/api/asana/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("Failed to disconnect");
      setStatus({ connected: false });
      setSuccess("Asana disconnected.");
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Failed to disconnect.");
    }
  }

  async function handleProjectChange(projectGid: string) {
    const project = status?.projects?.find((p) => p.gid === projectGid);
    setSaving(true);
    try {
      const res = await fetch("/api/asana/status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectGid: projectGid || null,
          projectName: project?.name || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setStatus((prev) =>
        prev ? { ...prev, projectGid, projectName: project?.name || null } : prev
      );
    } catch {
      setError("Failed to update project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAutoCreateToggle() {
    const newValue = !status?.autoCreateTasks;
    setSaving(true);
    try {
      const res = await fetch("/api/asana/status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoCreateTasks: newValue }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setStatus((prev) => (prev ? { ...prev, autoCreateTasks: newValue } : prev));
    } catch {
      setError("Failed to update setting.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <CheckSquare className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle className="text-base">Asana</CardTitle>
          </div>
          {status?.connected && (
            <Badge variant="success" size="sm">
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="rounded-md bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-green-50 p-2.5 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-300">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : status?.connected ? (
          <>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Workspace</span>
                <span className="font-medium">{status.workspaceName || "—"}</span>
              </div>

              {/* Project selector */}
              {status.projects && status.projects.length > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Project</span>
                  <Select
                    value={status.projectGid || ""}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="h-8 w-48 text-xs"
                    disabled={saving}
                    options={[
                      { value: "", label: "No project" },
                      ...status.projects.map((p) => ({
                        value: p.gid,
                        label: p.name,
                      })),
                    ]}
                  />
                </div>
              )}

              {/* Auto-create tasks toggle */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="font-medium">Auto-create tasks</p>
                  <p className="text-xs text-muted-foreground">
                    Create an Asana task when a quote request is submitted
                  </p>
                </div>
                <button
                  onClick={handleAutoCreateToggle}
                  disabled={saving}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    status.autoCreateTasks
                      ? "bg-primary"
                      : "bg-neutral-300 dark:bg-neutral-600"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                      status.autoCreateTasks ? "translate-x-4.5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={handleDisconnect}
            >
              Disconnect Asana
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Connect Asana to automatically create tasks when customers submit
              quote requests. Track your 3D printing workflow in Asana.
            </p>
            <Button
              size="sm"
              className="w-full"
              onClick={() => (window.location.href = "/api/asana/connect")}
            >
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Connect Asana
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
