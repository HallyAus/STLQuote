"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, roundCurrency } from "@/lib/utils";
import { Plus, FileText, Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";

interface Quote {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  subtotal: number;
  markupPct: number;
  total: number;
  currency: string;
  notes: string | null;
  expiryDate: string | null;
  createdAt: string;
  client: {
    id: string;
    name: string;
  } | null;
  lineItems: { id: string }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
];

function statusBadge(status: QuoteStatus) {
  const map: Record<QuoteStatus, { label: string; className: string }> = {
    DRAFT: {
      label: "Draft",
      className: "bg-gray-500/15 text-gray-500",
    },
    SENT: {
      label: "Sent",
      className: "bg-blue-500/15 text-blue-500",
    },
    ACCEPTED: {
      label: "Accepted",
      className: "bg-green-500/15 text-green-500",
    },
    REJECTED: {
      label: "Rejected",
      className: "bg-red-500/15 text-red-500",
    },
    EXPIRED: {
      label: "Expired",
      className: "bg-orange-500/15 text-orange-500",
    },
  };
  return map[status];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number): string {
  return `$${roundCurrency(value).toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Select component (matches existing codebase pattern)
// ---------------------------------------------------------------------------

function Select({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const id = label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile Card
// ---------------------------------------------------------------------------

function QuoteCard({
  quote,
  onClick,
}: {
  quote: Quote;
  onClick: () => void;
}) {
  const badge = statusBadge(quote.status);

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{quote.quoteNumber}</p>
            <p className="text-sm text-muted-foreground">
              {quote.client?.name ?? "\u2014"}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
              badge.className
            )}
          >
            {badge.label}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Items</span>
            <p className="font-medium">{quote.lineItems.length}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Total</span>
            <p className="font-medium">{formatCurrency(quote.total)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Created</span>
            <p className="font-medium">{formatDate(quote.createdAt)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  // ---- Fetch quotes ----
  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/quotes");
      if (!res.ok) throw new Error("Failed to fetch quotes");
      const data = await res.json();
      setQuotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // ---- Filtered list ----
  const filtered =
    statusFilter === "ALL"
      ? quotes
      : quotes.filter((q) => q.status === statusFilter);

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            className="w-36"
          />
          <span className="text-sm text-muted-foreground">
            {filtered.length} quote{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Button onClick={() => router.push("/quotes/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Quote
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {quotes.length === 0
                ? "No quotes yet. Create your first quote to get started."
                : "No quotes match the current filter."}
            </p>
            {quotes.length === 0 && (
              <Button
                variant="secondary"
                className="mt-2"
                onClick={() => router.push("/quotes/new")}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Quote
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <div className="hidden md:block">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      Quote #
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      Client
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                      Items
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                      Total
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((quote) => {
                    const badge = statusBadge(quote.status);

                    return (
                      <tr
                        key={quote.id}
                        className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted/50"
                        onClick={() => router.push(`/quotes/${quote.id}`)}
                      >
                        <td className="px-4 py-3 font-medium">
                          {quote.quoteNumber}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {quote.client?.name ?? "\u2014"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              badge.className
                            )}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {quote.lineItems.length}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatCurrency(quote.total)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(quote.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Mobile cards */}
      {filtered.length > 0 && (
        <div className="space-y-3 md:hidden">
          {filtered.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              onClick={() => router.push(`/quotes/${quote.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
