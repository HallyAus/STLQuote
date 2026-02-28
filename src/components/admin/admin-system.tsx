"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import { DeployLogs } from "./deploy-logs";
import {
  Terminal,
  Settings,
  Rocket,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  HardDrive,
  Database,
} from "lucide-react";

interface SystemHealth {
  tableCounts: {
    users: number;
    quotes: number;
    jobs: number;
    materials: number;
    printers: number;
    clients: number;
    invoices: number;
  };
  uploadsDirSizeBytes: number;
}

interface LogEntry {
  id: string;
  type: string;
  level: string;
  message: string;
  detail?: string | null;
  createdAt: string;
}

interface LogsPagination {
  page: number;
  total: number;
  totalPages: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

const LOG_TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "error", label: "Error" },
  { value: "xero_sync", label: "Xero Sync" },
  { value: "email", label: "Email" },
  { value: "billing", label: "Billing" },
  { value: "auth", label: "Auth" },
  { value: "system", label: "System" },
];

const LOG_LEVEL_OPTIONS = [
  { value: "all", label: "All levels" },
  { value: "info", label: "Info" },
  { value: "warn", label: "Warn" },
  { value: "error", label: "Error" },
];

export function AdminSystem() {
  // Section collapse states — all expanded by default
  const [healthOpen, setHealthOpen] = useState(true);
  const [deploysOpen, setDeploysOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(true);
  const [logsOpen, setLogsOpen] = useState(true);

  // Health
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // Config
  const [config, setConfig] = useState<Record<string, string>>({});
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsPagination, setLogsPagination] = useState<LogsPagination>({ page: 1, total: 0, totalPages: 0 });
  const [logsLoading, setLogsLoading] = useState(true);
  const [logType, setLogType] = useState("all");
  const [logLevel, setLogLevel] = useState("all");
  const [logPage, setLogPage] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Fetch health data from analytics endpoint
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/admin/analytics");
      if (res.ok) {
        const data = await res.json();
        setHealth(data.system);
      }
    } catch {
      /* ignore */
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Fetch config
  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch("/api/admin/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch {
      /* ignore */
    } finally {
      setConfigLoading(false);
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(logPage) });
      if (logType !== "all") params.set("type", logType);
      if (logLevel !== "all") params.set("level", logLevel);
      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setLogsPagination(data.pagination);
      }
    } catch {
      /* ignore */
    } finally {
      setLogsLoading(false);
    }
  }, [logPage, logType, logLevel]);

  useEffect(() => {
    fetchHealth();
    fetchConfig();
  }, [fetchHealth, fetchConfig]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filters change
  useEffect(() => {
    setLogPage(1);
  }, [logType, logLevel]);

  async function saveConfig(key: string, value: string) {
    setConfigSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        setConfig((prev) => ({ ...prev, [key]: value }));
      }
    } catch {
      /* ignore */
    } finally {
      setConfigSaving(false);
    }
  }

  function toggleConfig(key: string, currentValue: string) {
    const newValue = currentValue === "true" ? "false" : "true";
    saveConfig(key, newValue);
  }

  const registrationOpen = config.registrationOpen ?? "true";
  const waitlistMode = config.waitlistMode ?? "false";
  const dripEmailsEnabled = config.dripEmailsEnabled ?? "true";

  return (
    <div className="space-y-4">
      {/* Health */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setHealthOpen(!healthOpen)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Database className="h-4 w-4 text-muted-foreground" />
              Health
            </CardTitle>
            {healthOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {healthOpen && (
          <CardContent>
            {healthLoading || !health ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <HardDrive className="h-3.5 w-3.5" />
                    Uploads directory
                  </span>
                  <span className="text-sm font-medium">
                    {formatBytes(health.uploadsDirSizeBytes)}
                  </span>
                </div>
                <div className="border-t border-border pt-3 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Database tables
                  </p>
                  {Object.entries(health.tableCounts).map(([table, count]) => (
                    <div key={table} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground capitalize">{table}</span>
                      <span className="text-sm font-medium tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">App version</span>
                    <span className="text-sm font-medium font-mono">4.14.0</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Deploys */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setDeploysOpen(!deploysOpen)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Rocket className="h-4 w-4 text-muted-foreground" />
              Deploys
            </CardTitle>
            {deploysOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {deploysOpen && (
          <CardContent>
            <DeployLogs />
          </CardContent>
        )}
      </Card>

      {/* Config */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setConfigOpen(!configOpen)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Settings className="h-4 w-4 text-muted-foreground" />
              Config
            </CardTitle>
            {configOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {configOpen && (
          <CardContent>
            {configLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Public Registration toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Public Registration</p>
                    <p className="text-xs text-muted-foreground">
                      Allow new users to register on their own
                    </p>
                  </div>
                  <button
                    onClick={() => toggleConfig("registrationOpen", registrationOpen)}
                    disabled={configSaving}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                      registrationOpen === "true" ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 ease-in-out",
                        registrationOpen === "true" ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                {/* Waitlist Mode toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Waitlist Mode</p>
                    <p className="text-xs text-muted-foreground">
                      Require admin approval before new users can access the app
                    </p>
                  </div>
                  <button
                    onClick={() => toggleConfig("waitlistMode", waitlistMode)}
                    disabled={configSaving}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                      waitlistMode === "true" ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 ease-in-out",
                        waitlistMode === "true" ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                {/* Drip Emails toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Onboarding Drip Emails</p>
                    <p className="text-xs text-muted-foreground">
                      Send new users a daily feature email for 7 days after signup
                    </p>
                  </div>
                  <button
                    onClick={() => toggleConfig("dripEmailsEnabled", dripEmailsEnabled)}
                    disabled={configSaving}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                      dripEmailsEnabled === "true" ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 ease-in-out",
                        dripEmailsEnabled === "true" ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setLogsOpen(!logsOpen)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              Logs
            </CardTitle>
            {logsOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {logsOpen && (
          <CardContent>
            {/* Filters */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Select
                options={LOG_TYPE_OPTIONS}
                value={logType}
                onChange={(e) => setLogType(e.target.value)}
                className="w-36"
              />
              <Select
                options={LOG_LEVEL_OPTIONS}
                value={logLevel}
                onChange={(e) => setLogLevel(e.target.value)}
                className="w-32"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fetchLogs()}
                disabled={logsLoading}
              >
                <RefreshCw
                  className={cn("mr-1.5 h-3.5 w-3.5", logsLoading && "animate-spin")}
                />
                Refresh
              </Button>
            </div>

            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No logs found.
              </p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Time</th>
                        <th className="pb-2 pr-4 font-medium">Level</th>
                        <th className="pb-2 pr-4 font-medium">Type</th>
                        <th className="pb-2 pr-4 font-medium">Message</th>
                        <th className="pb-2 font-medium w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => {
                        const isExpanded = expandedLogId === log.id;
                        return (
                          <Fragment key={log.id}>
                            <tr
                              className="border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() =>
                                setExpandedLogId(isExpanded ? null : log.id)
                              }
                            >
                              <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                                {formatRelativeTime(log.createdAt)}
                              </td>
                              <td className="py-2 pr-4">
                                <span
                                  className={cn(
                                    "inline-flex h-5 min-w-[44px] items-center justify-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wider",
                                    log.level === "info"
                                      ? "bg-success/15 text-success-foreground"
                                      : log.level === "warn"
                                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                        : "bg-destructive/10 text-destructive-foreground"
                                  )}
                                >
                                  {log.level}
                                </span>
                              </td>
                              <td className="py-2 pr-4">
                                <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                  {log.type.replace(/_/g, " ")}
                                </span>
                              </td>
                              <td className="py-2 pr-4 max-w-md truncate text-muted-foreground">
                                {log.message}
                              </td>
                              <td className="py-2">
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </td>
                            </tr>
                            {isExpanded && log.detail && (
                              <tr className="border-b border-border/50">
                                <td colSpan={5} className="px-4 py-3 bg-muted/30">
                                  <pre className="whitespace-pre-wrap text-xs font-mono text-muted-foreground leading-relaxed">
                                    {log.detail}
                                  </pre>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-2 md:hidden">
                  {logs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <div
                        key={log.id}
                        className="rounded-lg border border-border p-3 space-y-2"
                      >
                        <button
                          className="w-full text-left"
                          onClick={() =>
                            setExpandedLogId(isExpanded ? null : log.id)
                          }
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={cn(
                                  "inline-flex h-5 min-w-[44px] items-center justify-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wider",
                                  log.level === "info"
                                    ? "bg-success/15 text-success-foreground"
                                    : log.level === "warn"
                                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                      : "bg-destructive/10 text-destructive-foreground"
                                )}
                              >
                                {log.level}
                              </span>
                              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                {log.type.replace(/_/g, " ")}
                              </span>
                              <span className="text-xs text-muted-foreground/60">
                                {formatRelativeTime(log.createdAt)}
                              </span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground truncate">
                            {log.message}
                          </p>
                        </button>
                        {isExpanded && log.detail && (
                          <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-xs font-mono text-muted-foreground leading-relaxed">
                            {log.detail}
                          </pre>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {logsPagination.totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={logPage <= 1}
                      onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                      Prev
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {logsPagination.page} / {logsPagination.totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={logPage >= logsPagination.totalPages}
                      onClick={() =>
                        setLogPage((p) =>
                          Math.min(logsPagination.totalPages, p + 1)
                        )
                      }
                    >
                      Next
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
