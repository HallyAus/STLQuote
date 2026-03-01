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
  Activity,
  Plug,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface HealthData {
  status: "healthy" | "warning" | "degraded";
  appVersion: string;
  nodeVersion: string;
  pgVersion: string;
  uptime: number;
  database: {
    connected: boolean;
    sizeBytes: number;
    totalRecords: number;
    tableCounts: Record<string, number>;
  };
  storage: {
    totalBytes: number;
    breakdown: { name: string; sizeBytes: number }[];
  };
  integrations: {
    name: string;
    configured: boolean;
    connectedUsers: number;
  }[];
  recentErrorCount: number;
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

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTableName(name: string): string {
  // camelCase → Title Case, or kebab-case → Title Case
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [tablesExpanded, setTablesExpanded] = useState(false);

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

  // Fetch health data from dedicated health endpoint
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/admin/health");
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
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
              <Activity className="h-4 w-4 text-muted-foreground" />
              Health
            </CardTitle>
            <div className="flex items-center gap-2">
              {health && (
                <span
                  className={cn(
                    "inline-flex h-2 w-2 rounded-full",
                    health.status === "healthy"
                      ? "bg-emerald-500"
                      : health.status === "warning"
                        ? "bg-amber-500"
                        : "bg-red-500"
                  )}
                />
              )}
              {healthOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>
        {healthOpen && (
          <CardContent>
            {healthLoading || !health ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* System info */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-muted/50 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Version</p>
                    <p className="mt-0.5 text-sm font-medium font-mono">{health.appVersion}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">PostgreSQL</p>
                    <p className="mt-0.5 text-sm font-medium font-mono">{health.pgVersion}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Node.js</p>
                    <p className="mt-0.5 text-sm font-medium font-mono">{health.nodeVersion}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Uptime</p>
                    <p className="mt-0.5 text-sm font-medium font-mono">{formatUptime(health.uptime)}</p>
                  </div>
                </div>

                {/* Database */}
                <div className="border-t border-border pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Database</p>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Size</span>
                    <span className="text-sm font-medium tabular-nums">{formatBytes(health.database.sizeBytes)}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Total records</span>
                    <span className="text-sm font-medium tabular-nums">{health.database.totalRecords.toLocaleString()}</span>
                  </div>
                  <button
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setTablesExpanded(!tablesExpanded)}
                  >
                    {tablesExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    {tablesExpanded ? "Hide" : "Show"} table breakdown ({Object.keys(health.database.tableCounts).length} tables)
                  </button>
                  {tablesExpanded && (
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                      {Object.entries(health.database.tableCounts).map(([table, count]) => (
                        <div key={table} className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{formatTableName(table)}</span>
                          <span className="text-xs font-medium tabular-nums">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Storage */}
                <div className="border-t border-border pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">File Storage</p>
                    <span className="ml-auto text-sm font-medium tabular-nums">{formatBytes(health.storage.totalBytes)}</span>
                  </div>
                  {health.storage.totalBytes > 0 && (
                    <>
                      {/* Storage bar */}
                      <div className="mb-2 flex h-2 overflow-hidden rounded-full bg-muted">
                        {health.storage.breakdown.filter(s => s.sizeBytes > 0).map((seg, i) => {
                          const pct = (seg.sizeBytes / health.storage.totalBytes) * 100;
                          const colours = [
                            "bg-sky-500",
                            "bg-violet-500",
                            "bg-amber-500",
                            "bg-muted-foreground/40",
                          ];
                          return (
                            <div
                              key={seg.name}
                              className={cn("h-full", colours[i % colours.length])}
                              style={{ width: `${Math.max(pct, 1)}%` }}
                            />
                          );
                        })}
                      </div>
                      <div className="space-y-1">
                        {health.storage.breakdown.map((seg, i) => {
                          const colours = [
                            "bg-sky-500",
                            "bg-violet-500",
                            "bg-amber-500",
                            "bg-muted-foreground/40",
                          ];
                          return (
                            <div key={seg.name} className="flex items-center justify-between">
                              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className={cn("inline-block h-2 w-2 rounded-full", colours[i % colours.length])} />
                                {formatTableName(seg.name)}
                              </span>
                              <span className="text-xs font-medium tabular-nums">{formatBytes(seg.sizeBytes)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Integrations */}
                <div className="border-t border-border pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Plug className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Integrations</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {health.integrations.map((integration) => (
                      <div
                        key={integration.name}
                        className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5"
                      >
                        <span
                          className={cn(
                            "inline-flex h-1.5 w-1.5 shrink-0 rounded-full",
                            integration.configured
                              ? integration.connectedUsers > 0
                                ? "bg-emerald-500"
                                : "bg-emerald-500/60"
                              : "bg-muted-foreground/30"
                          )}
                        />
                        <span className="text-xs text-muted-foreground truncate">{integration.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Errors */}
                {health.recentErrorCount > 0 && (
                  <div className="border-t border-border pt-3">
                    <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive-foreground" />
                      <span className="text-sm text-destructive-foreground">
                        {health.recentErrorCount} error{health.recentErrorCount !== 1 ? "s" : ""} in the last 24 hours
                      </span>
                    </div>
                  </div>
                )}

                {/* Refresh */}
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchHealth}
                    disabled={healthLoading}
                    className="text-xs text-muted-foreground"
                  >
                    <RefreshCw className={cn("mr-1.5 h-3 w-3", healthLoading && "animate-spin")} />
                    Refresh
                  </Button>
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
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <div className="flex items-center gap-2">
                <Select
                  options={LOG_TYPE_OPTIONS}
                  value={logType}
                  onChange={(e) => setLogType(e.target.value)}
                  className="flex-1 sm:flex-none sm:w-36"
                />
                <Select
                  options={LOG_LEVEL_OPTIONS}
                  value={logLevel}
                  onChange={(e) => setLogLevel(e.target.value)}
                  className="flex-1 sm:flex-none sm:w-32"
                />
              </div>
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
