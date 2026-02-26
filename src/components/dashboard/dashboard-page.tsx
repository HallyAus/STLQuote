"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { QUOTE_STATUS, JOB_STATUS, JOB_STATUS_ORDER, BANNER, STATUS_TEXT, type QuoteStatus as QStatus } from "@/lib/status-colours";
import { RevenueCharts } from "@/components/dashboard/revenue-charts";
import { AnalyticsCards } from "@/components/dashboard/analytics-cards";
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
}

interface ConsumableAlert {
  id: string;
  name: string;
  category: string;
  stockQty: number;
  lowStockThreshold: number;
  supplier: { name: string; email: string | null } | null;
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
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  href?: string;
}) {
  const content = (
    <Card className={cn("transition-colors", href && "hover:bg-accent/50")}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tracking-tight">{value}</p>
          {sub && (
            <p className="text-[11px] text-muted-foreground">{sub}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function StatusBar({ count, max, colour }: { count: number; max: number; colour: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className={cn("h-2 rounded-full transition-all", colour)}
        style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
      />
    </div>
  );
}

function QuoteBreakdownCard({ stats }: { stats: DashboardStats }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Quote Breakdown</CardTitle>
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
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Job Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {JOB_PIPELINE.map((row) => {
          const count = stats.jobStatusMap[row.status] ?? 0;
          return (
            <div key={row.status} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium tabular-nums">{count}</span>
              </div>
              <StatusBar count={count} max={stats.totalJobs} colour={row.colour} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function StockHealthCard({ stats }: { stats: DashboardStats }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Stock Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total materials</span>
          <span className="font-medium tabular-nums">{stats.totalMaterials}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Printers</span>
          <span className="font-medium tabular-nums">
            {stats.printersInUse} active / {stats.totalPrinters} total
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Low stock</span>
          <span className={cn("font-medium tabular-nums", stats.lowStockCount > 0 && STATUS_TEXT.warning)}>
            {stats.lowStockCount}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Out of stock</span>
          <span className={cn("font-medium tabular-nums", stats.outOfStockCount > 0 && STATUS_TEXT.danger)}>
            {stats.outOfStockCount}
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
        <CardTitle className="text-base font-semibold">Recent Quotes</CardTitle>
        <Link href="/quotes" className="text-sm text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {quotes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No quotes yet</p>
            <Link href="/quotes/new">
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Create your first quote
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {quotes.map((quote) => (
              <Link
                key={quote.id}
                href={`/quotes/${quote.id}`}
                className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{quote.quoteNumber}</span>
                    <Badge variant={QUOTE_STATUS[quote.status].variant}>
                      {QUOTE_STATUS[quote.status].label}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {quote.client?.name ?? "No client"}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {formatCurrency(quote.total)}
                </span>
              </Link>
            ))}
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
        <CardTitle className="text-base font-semibold">Active Jobs</CardTitle>
        <Link href="/jobs" className="text-sm text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Briefcase className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No active jobs</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href="/jobs"
                className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {job.quote?.quoteNumber ?? "Unlinked job"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {job.printer?.name ?? "No printer"}
                  </p>
                </div>
                <Badge variant={JOB_STATUS[job.status as keyof typeof JOB_STATUS]?.variant ?? "default"}>
                  {JOB_STATUS[job.status as keyof typeof JOB_STATUS]?.label ?? job.status}
                </Badge>
              </Link>
            ))}
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
        <CardTitle className="text-base font-semibold">
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
          <div className="space-y-2">
            {alerts.map((material) => (
              <div
                key={material.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {material.materialType}
                    {material.brand ? ` — ${material.brand}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    {material.colour ?? "No colour"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "font-medium tabular-nums",
                      material.stockQty === 0 ? STATUS_TEXT.danger : STATUS_TEXT.warning
                    )}
                  >
                    {material.stockQty} in stock
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Threshold: {material.lowStockThreshold}
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
        <CardTitle className="text-base font-semibold">
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
          <div className="space-y-2">
            {alerts.map((consumable) => (
              <div
                key={consumable.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">{consumable.name}</p>
                  <Badge variant="default" className="mt-1 text-[10px]">
                    {consumable.category}
                  </Badge>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "font-medium tabular-nums",
                      consumable.stockQty === 0 ? STATUS_TEXT.danger : STATUS_TEXT.warning
                    )}
                  >
                    {consumable.stockQty} / {consumable.lowStockThreshold}
                  </p>
                  {consumable.supplier?.email ? (
                    <a
                      href={`mailto:${consumable.supplier.email}?subject=${encodeURIComponent(`Reorder: ${consumable.name}`)}&body=${encodeURIComponent(`Hi, I'd like to reorder ${consumable.name}.`)}`}
                      className="mt-1 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Mail className="h-3 w-3" />
                      Reorder
                    </a>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">No supplier</p>
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
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
              <div className="space-y-2">
                <div className="h-3 w-14 animate-pulse rounded bg-muted" />
                <div className="h-5 w-10 animate-pulse rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-6 animate-pulse rounded bg-muted" />
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your 3D printing business</p>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-lg font-medium">Failed to load dashboard</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const { stats, recentQuotes, lowStockAlerts, activeJobs, consumableAlerts } = data;

  return (
    <div className="space-y-6">
      {/* Header + Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your 3D printing business</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/quotes/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              New Quote
            </Button>
          </Link>
          <Link href="/calculator">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Calculator className="h-3.5 w-3.5" />
              Calculator
            </Button>
          </Link>
          <Link href="/clients">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Clients
            </Button>
          </Link>
          <Link href="/jobs">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              Jobs
            </Button>
          </Link>
        </div>
      </div>

      {/* Trial / Free banner */}
      <TrialBanner />

      {/* Top row: 6 stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={FileText}
          label="Total Quotes"
          value={String(stats.totalQuotes)}
          href="/quotes"
        />
        <StatCard
          icon={DollarSign}
          label="Revenue"
          value={formatCurrency(stats.totalRevenue)}
        />
        <StatCard
          icon={CalendarDays}
          label="This Month"
          value={String(stats.quotesThisMonth)}
          sub="new quotes"
        />
        <StatCard
          icon={Briefcase}
          label="Active Jobs"
          value={String(stats.activeJobCount)}
          sub={`${stats.totalJobs} total`}
          href="/jobs"
        />
        <StatCard
          icon={Users}
          label="Clients"
          value={String(stats.totalClients)}
          href="/clients"
        />
        <StatCard
          icon={Palette}
          label="Stock Value"
          value={formatCurrency(stats.totalStockValue)}
          sub={`${stats.totalMaterials} materials`}
          href="/materials"
        />
      </div>

      {/* Middle row: Breakdown cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <QuoteBreakdownCard stats={stats} />
        <JobPipelineCard stats={stats} />
        <StockHealthCard stats={stats} />
      </div>

      {/* Bottom row: Lists */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <RecentQuotesList quotes={recentQuotes} />
        <ActiveJobsList jobs={activeJobs} />
        <LowStockAlertsList alerts={lowStockAlerts} />
        <ConsumableAlertsList alerts={consumableAlerts} />
      </div>

      {/* Revenue Charts */}
      <RevenueCharts />

      {/* Analytics */}
      <AnalyticsCards />
    </div>
  );
}
