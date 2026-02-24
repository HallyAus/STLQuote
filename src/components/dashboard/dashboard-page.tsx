"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  DollarSign,
  Printer,
  Palette,
  AlertTriangle,
  Plus,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// --- Types ---

type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";

interface DashboardStats {
  totalQuotes: number;
  draftQuotes: number;
  sentQuotes: number;
  acceptedQuotes: number;
  totalRevenue: number;
  totalPrinters: number;
  totalMaterials: number;
  lowStockMaterials: number;
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

interface LowStockMaterial {
  id: string;
  type: string;
  materialType: string;
  brand: string | null;
  colour: string | null;
  stockQty: number;
  lowStockThreshold: number;
}

interface DashboardData {
  stats: DashboardStats;
  recentQuotes: DashboardQuote[];
  lowStockAlerts: LowStockMaterial[];
}

// --- Status badge ---

function statusBadge(status: QuoteStatus) {
  const map: Record<QuoteStatus, { label: string; className: string }> = {
    DRAFT: { label: "Draft", className: "bg-gray-500/15 text-gray-500" },
    SENT: { label: "Sent", className: "bg-blue-500/15 text-blue-500" },
    ACCEPTED: {
      label: "Accepted",
      className: "bg-green-500/15 text-green-500",
    },
    REJECTED: { label: "Rejected", className: "bg-red-500/15 text-red-500" },
    EXPIRED: {
      label: "Expired",
      className: "bg-orange-500/15 text-orange-500",
    },
  };
  return map[status];
}

// --- Currency formatter ---

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// --- Stat card ---

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <Card className={cn("transition-colors", href && "hover:bg-accent/50")}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// --- Loading skeleton ---

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
              <div className="space-y-2">
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                <div className="h-6 w-12 animate-pulse rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-column skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded bg-muted"
                />
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="h-5 w-28 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="h-5 w-24 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-9 animate-pulse rounded bg-muted"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// --- Main component ---

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
          <p className="text-muted-foreground">
            Overview of your 3D printing business
          </p>
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

  const { stats, recentQuotes, lowStockAlerts } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your 3D printing business
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Total Quotes"
          value={String(stats.totalQuotes)}
          href="/quotes"
        />
        <StatCard
          icon={DollarSign}
          label="Accepted Revenue"
          value={formatCurrency(stats.totalRevenue)}
        />
        <StatCard
          icon={Printer}
          label="Printers"
          value={String(stats.totalPrinters)}
          href="/printers"
        />
        <StatCard
          icon={Palette}
          label="Materials"
          value={String(stats.totalMaterials)}
          href="/materials"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Recent Quotes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold">
              Recent Quotes
            </CardTitle>
            <Link
              href="/quotes"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recentQuotes.length === 0 ? (
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
                {recentQuotes.map((quote) => {
                  const badge = statusBadge(quote.status);
                  return (
                    <Link
                      key={quote.id}
                      href={`/quotes/${quote.id}`}
                      className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {quote.quoteNumber}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              badge.className
                            )}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {quote.client?.name ?? "No client"}
                        </p>
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

        {/* Right column */}
        <div className="space-y-6">
          {/* Low Stock Alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base font-semibold">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Low Stock Alerts
                </span>
              </CardTitle>
              {lowStockAlerts.length > 0 && (
                <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-medium text-orange-500">
                  {lowStockAlerts.length}
                </span>
              )}
            </CardHeader>
            <CardContent>
              {lowStockAlerts.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
                  All stock levels OK
                </div>
              ) : (
                <div className="space-y-2">
                  {lowStockAlerts.map((material) => (
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
                            material.stockQty === 0
                              ? "text-red-500"
                              : "text-orange-500"
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

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/quotes/new">
                  <Button variant="secondary" className="w-full justify-start">
                    <Plus className="mr-2 h-4 w-4" />
                    New Quote
                  </Button>
                </Link>
                <Link href="/calculator">
                  <Button variant="secondary" className="w-full justify-start">
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculator
                  </Button>
                </Link>
                <Link href="/printers">
                  <Button variant="secondary" className="w-full justify-start">
                    <Printer className="mr-2 h-4 w-4" />
                    Add Printer
                  </Button>
                </Link>
                <Link href="/materials">
                  <Button variant="secondary" className="w-full justify-start">
                    <Palette className="mr-2 h-4 w-4" />
                    Add Material
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
