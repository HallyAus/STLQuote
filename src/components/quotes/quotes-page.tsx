"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { roundCurrency } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Loader2, Download, Trash2, ArrowRightLeft } from "lucide-react";
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
          <Badge variant={QUOTE_STATUS[quote.status].variant}>
            {QUOTE_STATUS[quote.status].label}
          </Badge>
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
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState("DRAFT");
  const [bulkActing, setBulkActing] = useState(false);

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
      bulk.clearSelection();
      setBulkStatusModalOpen(false);
      await fetchQuotes();
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
      bulk.clearSelection();
      await fetchQuotes();
    } catch {
      setError("Bulk delete failed");
    } finally {
      setBulkActing(false);
    }
  }

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
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_OPTIONS}
            className="w-36"
          />
          <span className="text-sm text-muted-foreground">
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

      {/* Error banner */}
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
                  {filtered.map((quote) => {
                    return (
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
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatCurrency(quote.total)}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
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
