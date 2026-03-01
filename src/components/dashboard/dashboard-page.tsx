"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  FileText,
  DollarSign,
  Printer,
  Palette,
  AlertTriangle,
  Plus,
  Calculator,
  Briefcase,
  Users,
  CalendarDays,
  Mail,
  Sparkles,
  ShoppingCart,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { QUOTE_STATUS, JOB_STATUS, JOB_STATUS_ORDER, BANNER, STATUS_TEXT, type QuoteStatus as QStatus } from "@/lib/status-colours";
const RevenueCharts = dynamic(
  () => import("@/components/dashboard/revenue-charts").then((m) => ({ default: m.RevenueCharts })),
  { ssr: false, loading: () => <div className="h-80 rounded-xl bg-muted animate-pulse" /> }
);
const AnalyticsCards = dynamic(
  () => import("@/components/dashboard/analytics-cards").then((m) => ({ default: m.AnalyticsCards })),
  { ssr: false, loading: () => <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><div className="h-48 rounded-xl bg-muted animate-pulse" /><div className="h-48 rounded-xl bg-muted animate-pulse" /><div className="h-48 rounded-xl bg-muted animate-pulse" /></div> }
);
import { getEffectiveTier, trialDaysRemaining } from "@/lib/tier";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QuoteStatus = QStatus;

interface DashboardStats {
  totalQuotes: number;
  draftQuotes: number;
  sentQuotes: number;
  acceptedQuotes: number;
  rejectedQuotes: number;
  expiredQuotes: number;
  totalRevenue: number;
  quotesThisMonth: number;
  totalJobs: number;
  jobStatusMap: Record<string, number>;
  activeJobCount: number;
  totalClients: number;
  totalPrinters: number;
  printersInUse: number;
  totalMaterials: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

interface DashboardQuote {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  total: number;
  createdAt: string;
  client: { name: string } | null;
  _count: { lineItems: number };
}

interface DashboardJob {
  id: string;
  status: string;
  createdAt: string;
  quote: { quoteNumber: string } | null;
  printer: { name: string } | null;
}

interface LowStockMaterial {
  id: string;
  type: string;
  materialType: string;
  brand: string | null;
  colour: string | null;
  stockQty: number;
  lowStockThreshold: number;
  price: number;
  supplier: { name: string; email: string | null; website: string | null } | null;
}

interface ConsumableAlert {
  id: string;
  name: string;
  category: string;
  stockQty: number;
  lowStockThreshold: number;
  supplier: { name: string; email: string | null; website: string | null } | null;
}

interface DashboardData {
  stats: DashboardStats;
  recentQuotes: DashboardQuote[];
  lowStockAlerts: LowStockMaterial[];
  activeJobs: DashboardJob[];
  consumableAlerts: ConsumableAlert[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUOTE_BREAKDOWN = [
  { key: "draftQuotes", label: "Draft", colour: QUOTE_STATUS.DRAFT.barColour },
  { key: "sentQuotes", label: "Sent", colour: QUOTE_STATUS.SENT.barColour },
  { key: "acceptedQuotes", label: "Accepted", colour: QUOTE_STATUS.ACCEPTED.barColour },
  { key: "rejectedQuotes", label: "Rejected", colour: QUOTE_STATUS.REJECTED.barColour },
  { key: "expiredQuotes", label: "Expired", colour: QUOTE_STATUS.EXPIRED.barColour },
] as const;

const JOB_PIPELINE = JOB_STATUS_ORDER.map((status) => ({
  status,
  label: JOB_STATUS[status].label,
  colour: JOB_STATUS[status].dotColour,
}));

// Gradient accent configs per stat card type
const STAT_STYLES: Record<string, { gradient: string; iconBg: string; iconColour: string }> = {
  quotes:   { gradient: "from-primary/8 to-transparent",  iconBg: "bg-primary/12",  iconColour: "text-primary" },
  revenue:  { gradient: "from-success/8 to-transparent",  iconBg: "bg-success/12",  iconColour: "text-success-foreground" },
  month:    { gradient: "from-info/8 to-transparent",     iconBg: "bg-info/12",     iconColour: "text-info-foreground" },
  jobs:     { gradient: "from-warning/8 to-transparent",   iconBg: "bg-warning/12",  iconColour: "text-warning-foreground" },
  clients:  { gradient: "from-primary/8 to-transparent",  iconBg: "bg-primary/12",  iconColour: "text-primary" },
  stock:    { gradient: "from-success/8 to-transparent",  iconBg: "bg-success/12",  iconColour: "text-success-foreground" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
  style = "quotes",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  href?: string;
  style?: string;
}) {
  const s = STAT_STYLES[style] ?? STAT_STYLES.quotes;
  const content = (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-200",
      href && "hover:shadow-md hover:border-border/80 cursor-pointer"
    )}>
      {/* Subtle gradient background */}
      <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none", s.gradient)} />
      <CardContent className="relative flex items-center gap-3.5 p-4">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", s.iconBg)}>
          <Icon className={cn("h-5 w-5", s.iconColour)} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums leading-tight">{value}</p>
          {sub && (
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{sub}</p>
          )}
        </div>
        {href && (
          <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground/70" />
        )}
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function StatusBar({ count, max, colour }: { count: number; max: number; colour: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-muted">
      <div
        className={cn("h-1.5 rounded-full transition-all duration-500", colour)}
        style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
      />
    </div>
  );
}

function QuoteBreakdownCard({ stats }: { stats: DashboardStats }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Quote Breakdown</CardTitle>
          <Link href="/quotes" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {QUOTE_BREAKDOWN.map((row) => {
          const count = stats[row.key] as number;
          return (
            <div key={row.key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium tabular-nums">{count}</span>
              </div>
              <StatusBar count={count} max={stats.totalQuotes} colour={row.colour} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function JobPipelineCard({ stats }: { stats: DashboardStats }) {
  // Compact stacked bar at the top
  const total = stats.totalJobs || 1;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Job Pipeline</CardTitle>
          <Link href="/jobs" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Mini stacked bar */}
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
          {JOB_PIPELINE.map((row) => {
            const count = stats.jobStatusMap[row.status] ?? 0;
            const pct = (count / total) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={row.status}
                className={cn("h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full", row.colour)}
                style={{ width: `${pct}%` }}
                title={`${row.label}: ${count}`}
              />
            );
          })}
        </div>
        {/* Legend rows */}
        {JOB_PIPELINE.map((row) => {
          const count = stats.jobStatusMap[row.status] ?? 0;
          return (
            <div key={row.status} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className={cn("inline-block h-2 w-2 rounded-full", row.colour)} />
                {row.label}
              </span>
              <span className="font-medium tabular-nums">{count}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function StockHealthCard({ stats }: { stats: DashboardStats }) {
  const healthy = stats.totalMaterials - stats.lowStockCount - stats.outOfStockCount;
  const total = stats.totalMaterials || 1;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Stock Health</CardTitle>
          <Link href="/materials" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stacked bar for stock health */}
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
          {healthy > 0 && (
            <div className="h-full bg-success rounded-l-full" style={{ width: `${(healthy / total) * 100}%` }} />
          )}
          {stats.lowStockCount > 0 && (
            <div className="h-full bg-warning" style={{ width: `${(stats.lowStockCount / total) * 100}%` }} />
          )}
          {stats.outOfStockCount > 0 && (
            <div className="h-full bg-destructive rounded-r-full" style={{ width: `${(stats.outOfStockCount / total) * 100}%` }} />
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-success" />
            In stock
          </span>
          <span className="font-medium tabular-nums">{healthy}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-warning" />
            Low stock
          </span>
          <span className={cn("font-medium tabular-nums", stats.lowStockCount > 0 && STATUS_TEXT.warning)}>
            {stats.lowStockCount}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-destructive" />
            Out of stock
          </span>
          <span className={cn("font-medium tabular-nums", stats.outOfStockCount > 0 && STATUS_TEXT.danger)}>
            {stats.outOfStockCount}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Printers</span>
          <span className="font-medium tabular-nums">
            {stats.printersInUse} active / {stats.totalPrinters}
          </span>
        </div>
        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Stock value</span>
            <span className="text-lg font-bold tabular-nums">
              {formatCurrency(stats.totalStockValue)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentQuotesList({ quotes }: { quotes: DashboardQuote[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">Recent Quotes</CardTitle>
        <Link href="/quotes" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {quotes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium">No quotes yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Create your first quote to get started</p>
            </div>
            <Link href="/quotes/new">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                New Quote
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {quotes.map((quote) => {
              const statusConf = QUOTE_STATUS[quote.status];
              return (
                <Link
                  key={quote.id}
                  href={`/quotes/${quote.id}`}
                  className="flex items-center gap-3 rounded-md px-2.5 py-2 transition-colors hover:bg-accent/50"
                >
                  {/* Status dot */}
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", statusConf.barColour)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{quote.quoteNumber}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {quote.client?.name ?? "No client"}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {formatCurrency(quote.total)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveJobsList({ jobs }: { jobs: DashboardJob[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">Active Jobs</CardTitle>
        <Link href="/jobs" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Briefcase className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium">No active jobs</p>
              <p className="text-xs text-muted-foreground mt-0.5">Jobs will appear here when in progress</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {jobs.map((job) => {
              const statusConf = JOB_STATUS[job.status as keyof typeof JOB_STATUS];
              return (
                <Link
                  key={job.id}
                  href="/jobs"
                  className="flex items-center gap-3 rounded-md px-2.5 py-2 transition-colors hover:bg-accent/50"
                >
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", statusConf?.dotColour ?? "bg-muted-foreground")} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {job.quote?.quoteNumber ?? "Unlinked job"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {job.printer?.name ?? "No printer"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {statusConf?.label ?? job.status}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LowStockAlertsList({ alerts }: { alerts: LowStockMaterial[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">
          <span className="flex items-center gap-2">
            <AlertTriangle className={cn("h-4 w-4", STATUS_TEXT.warning)} />
            Low Stock
          </span>
        </CardTitle>
        {alerts.length > 0 && (
          <Badge variant="warning">{alerts.length}</Badge>
        )}
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className={cn("flex items-center gap-2", BANNER.success)}>
            All stock levels OK
          </div>
        ) : (
          <div className="space-y-1">
            {alerts.map((material) => (
              <div
                key={material.id}
                className="flex items-center justify-between rounded-md px-2.5 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm">
                    {material.materialType}
                    {material.brand ? ` — ${material.brand}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {material.colour ?? "No colour"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "font-medium tabular-nums text-sm",
                      material.stockQty === 0 ? STATUS_TEXT.danger : STATUS_TEXT.warning
                    )}
                  >
                    {material.stockQty}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    / {material.lowStockThreshold}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConsumableAlertsList({ alerts }: { alerts: ConsumableAlert[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">
          <span className="flex items-center gap-2">
            <AlertTriangle className={cn("h-4 w-4", STATUS_TEXT.warning)} />
            Consumable Alerts
          </span>
        </CardTitle>
        {alerts.length > 0 && (
          <Badge variant="warning">{alerts.length}</Badge>
        )}
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className={cn("flex items-center gap-2", BANNER.success)}>
            All stocked
          </div>
        ) : (
          <div className="space-y-1">
            {alerts.map((consumable) => (
              <div
                key={consumable.id}
                className="flex items-center justify-between rounded-md px-2.5 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">{consumable.name}</p>
                  <span className="text-[11px] text-muted-foreground">{consumable.category}</span>
                </div>
                <div className="shrink-0 text-right flex items-center gap-2">
                  <div>
                    <p
                      className={cn(
                        "font-medium tabular-nums",
                        consumable.stockQty === 0 ? STATUS_TEXT.danger : STATUS_TEXT.warning
                      )}
                    >
                      {consumable.stockQty} / {consumable.lowStockThreshold}
                    </p>
                  </div>
                  {consumable.supplier?.email && (
                    <a
                      href={`mailto:${consumable.supplier.email}?subject=${encodeURIComponent(`Reorder: ${consumable.name}`)}&body=${encodeURIComponent(`Hi, I'd like to reorder ${consumable.name}.`)}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors"
                      title={`Email ${consumable.supplier.name}`}
                    >
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Quick Actions
// ---------------------------------------------------------------------------

function QuickActionsRow() {
  const actions = [
    { href: "/quotes/new", icon: Plus, label: "New Quote", primary: true },
    { href: "/calculator", icon: Calculator, label: "Calculator" },
    { href: "/clients", icon: Users, label: "Clients" },
    { href: "/jobs", icon: Briefcase, label: "Jobs" },
    { href: "/purchase-orders", icon: ShoppingCart, label: "Orders" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Link key={a.href} href={a.href}>
          <Button
            size="sm"
            variant={a.primary ? "primary" : "secondary"}
            className="gap-1.5"
          >
            <a.icon className="h-3.5 w-3.5" />
            {a.label}
          </Button>
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reorder Suggestions
// ---------------------------------------------------------------------------

function ReorderSuggestions({
  materials,
  consumables,
}: {
  materials: LowStockMaterial[];
  consumables: ConsumableAlert[];
}) {
  const items = [
    ...materials.map((m) => ({
      id: m.id,
      name: `${m.materialType}${m.brand ? ` — ${m.brand}` : ""}`,
      type: "Material" as const,
      stockQty: m.stockQty,
      threshold: m.lowStockThreshold,
      suggestedQty: Math.max(m.lowStockThreshold * 2 - m.stockQty, 1),
      supplier: m.supplier,
    })),
    ...consumables.map((c) => ({
      id: c.id,
      name: c.name,
      type: "Consumable" as const,
      stockQty: c.stockQty,
      threshold: c.lowStockThreshold,
      suggestedQty: Math.max(c.lowStockThreshold * 2 - c.stockQty, 1),
      supplier: c.supplier,
    })),
  ];

  if (items.length === 0) return null;

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">
          <span className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Reorder Suggestions
          </span>
        </CardTitle>
        <Link href="/purchase-orders">
          <Badge variant="default" className="cursor-pointer hover:bg-primary/20">
            Create PO
          </Badge>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="flex items-center justify-between rounded-md px-2.5 py-2 text-sm hover:bg-accent/30 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant={item.type === "Material" ? "default" : "warning"} className="text-[10px]">
                    {item.type}
                  </Badge>
                  {item.supplier && (
                    <span className="text-xs text-muted-foreground">{item.supplier.name}</span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right flex items-center gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Suggest: <span className="font-semibold text-foreground tabular-nums">{item.suggestedQty}</span>
                  </p>
                  <p className={cn(
                    "text-xs tabular-nums",
                    item.stockQty === 0 ? STATUS_TEXT.danger : STATUS_TEXT.warning
                  )}>
                    {item.stockQty} / {item.threshold}
                  </p>
                </div>
                {item.supplier?.website && (
                  <a
                    href={item.supplier.website.startsWith("http") ? item.supplier.website : `https://${item.supplier.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors"
                    title={`Visit ${item.supplier.name}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
                {item.supplier?.email && (
                  <a
                    href={`mailto:${item.supplier.email}?subject=${encodeURIComponent(`Reorder: ${item.name}`)}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors"
                    title={`Email ${item.supplier.name}`}
                  >
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="flex items-center gap-3.5 p-4">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
              <div className="space-y-2 flex-1">
                <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
                <div className="h-6 w-12 animate-pulse rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Middle cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="h-4 w-28 animate-pulse rounded bg-muted mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-8 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function TrialBanner() {
  const { data: session } = useSession();
  if (!session?.user) return null;

  const tier = getEffectiveTier({
    subscriptionTier: session.user.subscriptionTier ?? "free",
    subscriptionStatus: session.user.subscriptionStatus ?? "trialing",
    trialEndsAt: session.user.trialEndsAt ?? null,
    role: session.user.role,
  });
  const isTrialing = session.user.subscriptionStatus === "trialing";
  const daysLeft = trialDaysRemaining(session.user.trialEndsAt ?? null);
  const isFree = tier === "free";

  if (isTrialing && daysLeft > 0) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <p className="text-sm font-medium text-amber-200">
            Pro trial — {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining
          </p>
        </div>
        <Link href="/settings">
          <Button size="sm" variant="secondary" className="gap-1.5 text-xs">
            Upgrade to Pro
          </Button>
        </Link>
      </div>
    );
  }

  if (isFree && !isTrialing) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-muted bg-muted/50 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          You&apos;re on the <span className="font-medium text-foreground">Free</span> plan. Upgrade to unlock invoicing, suppliers, analytics, and more.
        </p>
        <Link href="/settings">
          <Button size="sm" className="gap-1.5 text-xs">
            <Sparkles className="h-3 w-3" />
            Upgrade
          </Button>
        </Link>
      </div>
    );
  }

  return null;
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error("Failed to load dashboard data");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive-foreground" />
        </div>
        <p className="text-lg font-medium">Failed to load dashboard</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const { stats, recentQuotes, lowStockAlerts, activeJobs, consumableAlerts } = data;

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <QuickActionsRow />

      {/* Trial / Free banner */}
      <TrialBanner />

      {/* Top row: 6 stat cards — 2x3 on mobile, 3x2 on tablet, 6 across on desktop */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={FileText}
          label="Quotes"
          value={String(stats.totalQuotes)}
          href="/quotes"
          style="quotes"
        />
        <StatCard
          icon={DollarSign}
          label="Revenue"
          value={formatCurrency(stats.totalRevenue)}
          style="revenue"
        />
        <StatCard
          icon={CalendarDays}
          label="This Month"
          value={String(stats.quotesThisMonth)}
          sub="new quotes"
          style="month"
        />
        <StatCard
          icon={Briefcase}
          label="Active Jobs"
          value={String(stats.activeJobCount)}
          sub={`${stats.totalJobs} total`}
          href="/jobs"
          style="jobs"
        />
        <StatCard
          icon={Users}
          label="Clients"
          value={String(stats.totalClients)}
          href="/clients"
          style="clients"
        />
        <StatCard
          icon={Palette}
          label="Stock Value"
          value={formatCurrency(stats.totalStockValue)}
          sub={`${stats.totalMaterials} materials`}
          href="/materials"
          style="stock"
        />
      </div>

      {/* Middle row: Breakdown cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <QuoteBreakdownCard stats={stats} />
        <JobPipelineCard stats={stats} />
        <StockHealthCard stats={stats} />
      </div>

      {/* Bottom row: Lists */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <RecentQuotesList quotes={recentQuotes} />
        <ActiveJobsList jobs={activeJobs} />
        <LowStockAlertsList alerts={lowStockAlerts} />
        <ConsumableAlertsList alerts={consumableAlerts} />
      </div>

      {/* Reorder Suggestions (only shown when items need reordering) */}
      {(lowStockAlerts.length > 0 || consumableAlerts.length > 0) && (
        <ReorderSuggestions materials={lowStockAlerts} consumables={consumableAlerts} />
      )}

      {/* Revenue Charts */}
      <RevenueCharts />

      {/* Analytics */}
      <AnalyticsCards />
    </div>
  );
}
