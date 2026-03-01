"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { roundCurrency } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SkeletonListPage } from "@/components/ui/skeleton";
import { Plus, FileText, Loader2, Download, Trash2, ArrowRightLeft, Search } from "lucide-react";
import { QUOTE_STATUS, BANNER, type QuoteStatus } from "@/lib/status-colours";
import { Checkbox } from "@/components/ui/checkbox";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { BulkActionBar } from "@/components/shared/bulk-action-bar";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(value: number): string {
  return `$${roundCurrency(value).toFixed(2)}`;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function expiryLabel(dateStr: string | null): { text: string; urgent: boolean } | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: "Expired", urgent: true };
  if (days === 0) return { text: "Expires today", urgent: true };
  if (days <= 3) return { text: `Expires in ${days}d`, urgent: true };
  if (days <= 7) return { text: `Expires in ${days}d`, urgent: false };
  return null;
}

function clientInitial(name: string | undefined): string {
  return (name?.[0] ?? "?").toUpperCase();
}

// ---------------------------------------------------------------------------
// Revenue Summary Strip
// ---------------------------------------------------------------------------

function RevenueSummary({
  quotes,
  activeFilter,
  onFilterClick,
}: {
  quotes: Quote[];
  activeFilter: string;
  onFilterClick: (status: string) => void;
}) {
  const stats = useMemo(() => {
    const byStatus: Record<string, { count: number; value: number }> = {};
    let totalValue = 0;
    for (const q of quotes) {
      if (!byStatus[q.status]) byStatus[q.status] = { count: 0, value: 0 };
      byStatus[q.status].count++;
      byStatus[q.status].value += q.total;
      totalValue += q.total;
    }
    const avgValue = quotes.length > 0 ? totalValue / quotes.length : 0;
    return { byStatus, totalValue, avgValue, count: quotes.length };
  }, [quotes]);

  const cards = [
    { label: "All Quotes", value: stats.count.toString(), subValue: formatCurrency(stats.totalValue), filter: "ALL" },
    { label: "Draft", value: (stats.byStatus.DRAFT?.count ?? 0).toString(), subValue: formatCurrency(stats.byStatus.DRAFT?.value ?? 0), filter: "DRAFT" },
    { label: "Sent", value: (stats.byStatus.SENT?.count ?? 0).toString(), subValue: formatCurrency(stats.byStatus.SENT?.value ?? 0), filter: "SENT" },
    { label: "Accepted", value: (stats.byStatus.ACCEPTED?.count ?? 0).toString(), subValue: formatCurrency(stats.byStatus.ACCEPTED?.value ?? 0), filter: "ACCEPTED" },
    { label: "Avg Value", value: formatCurrency(stats.avgValue), subValue: null, filter: null },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <button
          key={card.label}
          type="button"
          onClick={() => card.filter && onFilterClick(card.filter)}
          disabled={!card.filter}
          className={`rounded-lg border p-3 text-left transition-colors ${
            card.filter === activeFilter
              ? "border-primary bg-primary/5"
              : card.filter
                ? "border-border bg-card hover:bg-muted/50"
                : "border-border bg-card cursor-default"
          }`}
        >
          <p className="text-xs text-muted-foreground">{card.label}</p>
          <p className="text-lg font-bold tabular-nums">{card.value}</p>
          {card.subValue && (
            <p className="text-xs text-muted-foreground tabular-nums">{card.subValue}</p>
          )}
        </button>
      ))}
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
  const expiry = expiryLabel(quote.expiryDate);

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {clientInitial(quote.client?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{quote.quoteNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {quote.client?.name ?? "\u2014"}
                </p>
              </div>
              <Badge variant={QUOTE_STATUS[quote.status].variant}>
                {QUOTE_STATUS[quote.status].label}
              </Badge>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground">
                  {quote.lineItems.length} item{quote.lineItems.length !== 1 ? "s" : ""}
                </span>
                <span className="text-muted-foreground">{relativeTime(quote.createdAt)}</span>
                {expiry && (
                  <span className={expiry.urgent ? "text-destructive font-medium" : "text-muted-foreground"}>
                    {expiry.text}
                  </span>
                )}
              </div>
              <p className="text-lg font-bold tabular-nums text-primary">
                {formatCurrency(quote.total)}
              </p>
            </div>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState("DRAFT");
  const [bulkActing, setBulkActing] = useState(false);

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

  // Filtered + searched list
  const filtered = useMemo(() => {
    let result = statusFilter === "ALL"
      ? quotes
      : quotes.filter((q) => q.status === statusFilter);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (q) =>
          q.quoteNumber.toLowerCase().includes(query) ||
          q.client?.name.toLowerCase().includes(query) ||
          false
      );
    }
    return result;
  }, [quotes, statusFilter, searchQuery]);

  const bulk = useBulkSelection(filtered.map((q) => q.id));

  async function handleBulkStatusChange() {
    setBulkActing(true);
    try {
      const res = await fetch("/api/quotes/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(bulk.selectedIds), action: "change_status", status: bulkNewStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      setBulkStatusModalOpen(false);
      setQuotes((prev) =>
        prev.map((q) =>
          bulk.selectedIds.has(q.id) ? { ...q, status: bulkNewStatus as QuoteStatus } : q
        )
      );
      bulk.clearSelection();
    } catch {
      setError("Bulk status change failed");
    } finally {
      setBulkActing(false);
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${bulk.count} selected quotes? This cannot be undone.`)) return;
    setBulkActing(true);
    try {
      const res = await fetch("/api/quotes/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(bulk.selectedIds), action: "delete" }),
      });
      if (!res.ok) throw new Error("Failed");
      setQuotes((prev) => prev.filter((q) => !bulk.selectedIds.has(q.id)));
      bulk.clearSelection();
    } catch {
      setError("Bulk delete failed");
    } finally {
      setBulkActing(false);
    }
  }

  if (loading) {
    return <SkeletonListPage />;
  }

  return (
    <div className="space-y-4">
      {/* Revenue Summary */}
      {quotes.length > 0 && (
        <RevenueSummary
          quotes={quotes}
          activeFilter={statusFilter}
          onFilterClick={setStatusFilter}
        />
      )}

      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-background -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6 pt-4 md:pt-6 pb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_OPTIONS}
            className="w-36"
          />
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search quotes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-9 w-56 rounded-md border border-input bg-background pl-8 pr-3 py-1 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {filtered.length} quote{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              window.location.href = "/api/export/quotes";
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => router.push("/quotes/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Quote
          </Button>
        </div>
      </div>

      {error && (
        <div className={BANNER.error}>
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
                : searchQuery
                  ? "No quotes match your search."
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
                    <th className="w-10 px-4 py-2.5">
                      <Checkbox
                        checked={bulk.isAllSelected}
                        indeterminate={bulk.isIndeterminate}
                        onChange={bulk.toggleAll}
                      />
                    </th>
                    <th className="px-4 py-2.5 font-medium text-muted-foreground">
                      Quote #
                    </th>
                    <th className="px-4 py-2.5 font-medium text-muted-foreground">
                      Client
                    </th>
                    <th className="px-4 py-2.5 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">
                      Items
                    </th>
                    <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">
                      Total
                    </th>
                    <th className="px-4 py-2.5 font-medium text-muted-foreground">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((quote) => (
                    <tr
                      key={quote.id}
                      className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted/50"
                      onClick={() => router.push(`/quotes/${quote.id}`)}
                    >
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={bulk.selectedIds.has(quote.id)}
                          onChange={() => bulk.toggleOne(quote.id)}
                        />
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        {quote.quoteNumber}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {quote.client?.name ?? "\u2014"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={QUOTE_STATUS[quote.status].variant}>
                          {QUOTE_STATUS[quote.status].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {quote.lineItems.length}
                      </td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${
                        quote.status === "ACCEPTED" ? "text-primary" : ""
                      }`}>
                        {formatCurrency(quote.total)}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        <span>{formatDate(quote.createdAt)}</span>
                        <span className="ml-2 text-xs opacity-60">{relativeTime(quote.createdAt)}</span>
                      </td>
                    </tr>
                  ))}
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

      {/* Bulk action bar */}
      <BulkActionBar
        count={bulk.count}
        onClear={bulk.clearSelection}
        actions={[
          {
            label: "Change Status",
            icon: <ArrowRightLeft className="mr-1 h-3.5 w-3.5" />,
            onClick: () => setBulkStatusModalOpen(true),
          },
          {
            label: "Export CSV",
            icon: <Download className="mr-1 h-3.5 w-3.5" />,
            onClick: () => {
              window.location.href = "/api/export/quotes";
            },
          },
          {
            label: "Delete",
            icon: <Trash2 className="mr-1 h-3.5 w-3.5" />,
            onClick: handleBulkDelete,
            variant: "destructive",
            disabled: bulkActing,
          },
        ]}
      />

      {/* Bulk status change modal */}
      {bulkStatusModalOpen && (
        <Dialog open={true} onClose={() => setBulkStatusModalOpen(false)}>
          <DialogHeader onClose={() => setBulkStatusModalOpen(false)}>
            <DialogTitle>Change Status ({bulk.count} quotes)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              label="New Status"
              value={bulkNewStatus}
              onChange={(e) => setBulkNewStatus(e.target.value)}
              options={STATUS_OPTIONS.filter((o) => o.value !== "ALL")}
            />
            <DialogFooter>
              <Button variant="secondary" onClick={() => setBulkStatusModalOpen(false)} disabled={bulkActing}>
                Cancel
              </Button>
              <Button onClick={handleBulkStatusChange} disabled={bulkActing}>
                {bulkActing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Apply
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}
    </div>
  );
}
