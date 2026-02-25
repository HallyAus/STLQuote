"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrinterUtilisation {
  name: string;
  utilisation: number;
}

interface TopMaterial {
  materialType: string;
  brand: string | null;
  count: number;
}

interface AnalyticsData {
  printerUtilisation: PrinterUtilisation[];
  topMaterials: TopMaterial[];
  averageMarkup: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function utilisationColour(pct: number): string {
  if (pct > 80) return "bg-red-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-green-500";
}

function utilisationTextColour(pct: number): string {
  if (pct > 80) return "text-red-500";
  if (pct >= 50) return "text-amber-500";
  return "text-green-500";
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function AnalyticsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-6 animate-pulse rounded bg-muted" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PrinterUtilisationCard({ printers }: { printers: PrinterUtilisation[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Printer Utilisation</CardTitle>
      </CardHeader>
      <CardContent>
        {printers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No printers configured</p>
        ) : (
          <div className="space-y-3">
            {printers.map((printer) => (
              <div key={printer.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate text-muted-foreground">{printer.name}</span>
                  <span
                    className={cn(
                      "shrink-0 font-medium tabular-nums",
                      utilisationTextColour(printer.utilisation)
                    )}
                  >
                    {printer.utilisation}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all",
                      utilisationColour(printer.utilisation)
                    )}
                    style={{ width: `${Math.min(printer.utilisation, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopMaterialsCard({ materials }: { materials: TopMaterial[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Top Materials</CardTitle>
      </CardHeader>
      <CardContent>
        {materials.length === 0 ? (
          <p className="text-sm text-muted-foreground">No material usage data yet</p>
        ) : (
          <div className="space-y-2">
            {materials.map((material, index) => (
              <div
                key={`${material.materialType}-${material.brand}-${index}`}
                className="flex items-center justify-between rounded-lg border border-border p-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{material.materialType}</p>
                    {material.brand && (
                      <p className="truncate text-xs text-muted-foreground">{material.brand}</p>
                    )}
                  </div>
                </div>
                <Badge variant="default" className="shrink-0 tabular-nums">
                  {material.count} {material.count === 1 ? "use" : "uses"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AverageMarkupCard({ markup }: { markup: number }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Average Markup</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-4">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold tabular-nums tracking-tight">
              {markup}
            </span>
            <span className="text-2xl font-semibold text-muted-foreground">%</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">across non-draft quotes</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AnalyticsCards() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/dashboard/analytics");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // Non-critical — dashboard still usable without analytics
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) return <AnalyticsSkeleton />;
  if (!data) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <PrinterUtilisationCard printers={data.printerUtilisation} />
      <TopMaterialsCard materials={data.topMaterials} />
      <AverageMarkupCard markup={data.averageMarkup} />
    </div>
  );
}
