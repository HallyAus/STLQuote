"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  FileText,
  Briefcase,
  Upload,
  TrendingUp,
  Loader2,
  HardDrive,
  Database,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import type { AnalyticsData } from "./admin-types";

const chartTooltipStyle = {
  backgroundColor: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "var(--color-popover-foreground)",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export function AdminOverview() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics");
      if (res.ok) setData(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { overview, charts, topUsers, system, recentLogs } = data;

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{overview.totalUsers}</div>
                <div className="text-sm text-muted-foreground">Total users</div>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            {overview.newUsersThisWeek > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                +{overview.newUsersThisWeek} this week
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{overview.quotesThisMonth}</div>
                <div className="text-sm text-muted-foreground">Quotes this month</div>
              </div>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {overview.conversionRate}% conversion rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{overview.activeJobs}</div>
                <div className="text-sm text-muted-foreground">Active jobs</div>
              </div>
              <Briefcase className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{overview.pendingRequests}</div>
                <div className="text-sm text-muted-foreground">Pending requests</div>
              </div>
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Signups chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Signups — Last 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.dailySignups}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateLabel}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.floor(charts.dailySignups.length / 5)}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    labelFormatter={formatDateLabel}
                    formatter={(value: number) => [value, "Signups"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-primary)"
                    fill="var(--color-primary)"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quotes chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Quotes — Last 30 Days
              </CardTitle>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Accepted</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />Sent</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-zinc-400" />Draft</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.dailyQuotes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateLabel}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.floor(charts.dailyQuotes.length / 5)}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    labelFormatter={formatDateLabel}
                  />
                  <Bar dataKey="accepted" name="Accepted" stackId="quotes" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="sent" name="Sent" stackId="quotes" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="draft" name="Draft" stackId="quotes" fill="#a1a1aa" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="other" name="Other" stackId="quotes" fill="#71717a" radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Top users + Recent activity + System health */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top users */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Activity className="h-4 w-4" />
              Most Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topUsers.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No user data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">User</th>
                      <th className="pb-2 pr-4 font-medium text-right">Quotes</th>
                      <th className="pb-2 pr-4 font-medium text-right">Jobs</th>
                      <th className="pb-2 pr-4 font-medium text-right">Storage</th>
                      <th className="pb-2 font-medium text-right">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsers.map((user) => (
                      <tr key={user.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4">
                          <div className="font-medium">{user.name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">{user.quotesCount}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">{user.jobsCount}</td>
                        <td className="py-2 pr-4 text-right text-muted-foreground">
                          {formatBytes(user.storage.totalBytes)}
                        </td>
                        <td className="py-2 text-right text-muted-foreground whitespace-nowrap">
                          {user.lastLogin ? formatRelativeTime(user.lastLogin) : "Never"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System health mini-card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Database className="h-4 w-4" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <HardDrive className="h-3.5 w-3.5" />
                Uploads
              </span>
              <span className="text-sm font-medium">{formatBytes(system.uploadsDirSizeBytes)}</span>
            </div>
            {Object.entries(system.tableCounts).map(([table, count]) => (
              <div key={table} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground capitalize">{table}</span>
                <span className="text-sm font-medium tabular-nums">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      {recentLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 text-sm">
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
                  <span className="flex-1 truncate text-muted-foreground">{log.message}</span>
                  <span className="shrink-0 text-xs text-muted-foreground/60 whitespace-nowrap">
                    {formatRelativeTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
