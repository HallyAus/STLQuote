"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, TrendingUp, Target, CheckCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RevenueData {
  monthlyRevenue: { month: string; revenue: number; quotes: number }[];
  conversionRate: number;
  completionRate: number;
  totalAccepted: number;
  totalDecided: number;
  completedJobs: number;
  totalJobs: number;
}

export function RevenueCharts() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRevenue() {
      try {
        const res = await fetch("/api/dashboard/revenue");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    }
    fetchRevenue();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const totalRevenue = data.monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">12-Month Revenue</p>
              <p className="text-lg font-bold tabular-nums">
                ${totalRevenue.toLocaleString("en-AU", { minimumFractionDigits: 0 })}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
              <Target className="h-4 w-4 text-success-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Conversion Rate</p>
              <p className="text-lg font-bold tabular-nums">{data.conversionRate}%</p>
              <p className="text-[10px] text-muted-foreground">
                {data.totalAccepted}/{data.totalDecided} quotes
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10">
              <CheckCircle className="h-4 w-4 text-info-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Job Completion</p>
              <p className="text-lg font-bold tabular-nums">{data.completionRate}%</p>
              <p className="text-[10px] text-muted-foreground">
                {data.completedJobs}/{data.totalJobs} jobs
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Monthly Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                />
                <Bar
                  dataKey="revenue"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
