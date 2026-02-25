"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { roundCurrency } from "@/lib/utils";
import { Plus, FileText, Loader2 } from "lucide-react";
import { BANNER } from "@/lib/status-colours";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: number;
  taxPct: number;
  tax: number;
  total: number;
  currency: string;
  notes: string | null;
  dueDate: string | null;
  paidAt: string | null;
  sentAt: string | null;
  createdAt: string;
  client: { name: string } | null;
  lineItems: { id: string }[];
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const INVOICE_STATUS: Record<
  InvoiceStatus,
  { label: string; variant: "default" | "info" | "success" | "destructive" | "warning" }
> = {
  DRAFT:   { label: "Draft",   variant: "default" },
  SENT:    { label: "Sent",    variant: "info" },
  PAID:    { label: "Paid",    variant: "success" },
  OVERDUE: { label: "Overdue", variant: "destructive" },
  VOID:    { label: "Void",    variant: "warning" },
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "VOID", label: "Void" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(value: number): string {
  return `$${roundCurrency(value).toFixed(2)}`;
}

function isThisMonth(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

// ---------------------------------------------------------------------------
// Create Invoice Modal
// ---------------------------------------------------------------------------

function CreateInvoiceModal({
  clients,
  onClose,
  onCreated,
}: {
  clients: { id: string; name: string; company: string | null }[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [clientId, setClientId] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taxPct, setTaxPct] = useState("10");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Line items state
  const [lineItems, setLineItems] = useState<
    { description: string; quantity: string; unitPrice: string; notes: string }[]
  >([{ description: "", quantity: "1", unitPrice: "0", notes: "" }]);

  function addRow() {
    setLineItems((prev) => [
      ...prev,
      { description: "", quantity: "1", unitPrice: "0", notes: "" },
    ]);
  }

  function removeRow(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(
    index: number,
    field: "description" | "quantity" | "unitPrice" | "notes",
    value: string
  ) {
    setLineItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  async function handleCreate() {
    const items = lineItems
      .filter((r) => r.description.trim())
      .map((r) => {
        const qty = parseInt(r.quantity) || 1;
        const unit = parseFloat(r.unitPrice) || 0;
        return {
          description: r.description.trim(),
          quantity: qty,
          unitPrice: roundCurrency(unit),
          lineTotal: roundCurrency(unit * qty),
          notes: r.notes.trim() || null,
        };
      });

    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId || null,
          quoteId: quoteId || null,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          taxPct: parseFloat(taxPct) || 10,
          notes: notes.trim() || null,
          terms: terms.trim() || null,
          lineItems: items,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to create invoice");
      }

      const invoice = await res.json();
      onCreated(invoice.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  const clientOptions = [
    { value: "", label: "-- No client --" },
    ...clients.map((c) => ({
      value: c.id,
      label: c.company ? `${c.name} (${c.company})` : c.name,
    })),
  ];

  return (
    <Dialog open={true} onClose={onClose}>
      <DialogHeader onClose={onClose}>
        <DialogTitle>New Invoice</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {error && <div className={BANNER.error}>{error}</div>}

        <Select
          label="Client"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          options={clientOptions}
        />

        <Input
          label="Quote ID (optional)"
          value={quoteId}
          onChange={(e) => setQuoteId(e.target.value)}
          placeholder="Link to an existing quote..."
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <Input
            label="Tax %"
            type="number"
            min="0"
            step="0.1"
            value={taxPct}
            onChange={(e) => setTaxPct(e.target.value)}
          />
        </div>

        {/* Line items */}
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Line Items</p>
          <div className="space-y-2">
            {lineItems.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <Input
                    label={i === 0 ? "Description" : undefined}
                    value={row.description}
                    onChange={(e) => updateRow(i, "description", e.target.value)}
                    placeholder="Item description"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    label={i === 0 ? "Qty" : undefined}
                    type="number"
                    min="1"
                    value={row.quantity}
                    onChange={(e) => updateRow(i, "quantity", e.target.value)}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    label={i === 0 ? "Unit Price" : undefined}
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.unitPrice}
                    onChange={(e) => updateRow(i, "unitPrice", e.target.value)}
                  />
                </div>
                <div className="col-span-2 flex justify-end">
                  {lineItems.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(i)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" className="mt-2" onClick={addRow}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Row
          </Button>
        </div>

        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Invoice notes..."
          className="min-h-[60px]"
        />

        <Textarea
          label="Terms"
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          placeholder="Payment terms..."
          className="min-h-[60px]"
        />

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Invoice"
            )}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Mobile Card
// ---------------------------------------------------------------------------

function InvoiceCard({
  invoice,
  onClick,
}: {
  invoice: Invoice;
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
            <p className="font-semibold">{invoice.invoiceNumber}</p>
            <p className="text-sm text-muted-foreground">
              {invoice.client?.name ?? "\u2014"}
            </p>
          </div>
          <Badge variant={INVOICE_STATUS[invoice.status].variant}>
            {INVOICE_STATUS[invoice.status].label}
          </Badge>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Items</span>
            <p className="font-medium">{invoice.lineItems.length}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Total</span>
            <p className="font-medium">{formatCurrency(invoice.total)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Due</span>
            <p className="font-medium">{formatDate(invoice.dueDate)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string; company: string | null }[]>([]);

  // ---- Fetch invoices ----
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/invoices");
      if (!res.ok) throw new Error("Failed to fetch invoices");
      const data = await res.json();
      setInvoices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Fetch clients for the create modal
  useEffect(() => {
    async function loadClients() {
      const res = await fetch("/api/clients").catch(() => null);
      if (res?.ok) {
        const data = await res.json();
        setClients(
          data.map((c: { id: string; name: string; company: string | null }) => ({
            id: c.id,
            name: c.name,
            company: c.company,
          }))
        );
      }
    }
    loadClients();
  }, []);

  // ---- Stats ----
  const totalOutstanding = roundCurrency(
    invoices
      .filter((inv) => inv.status === "SENT" || inv.status === "OVERDUE")
      .reduce((sum, inv) => sum + inv.total, 0)
  );

  const totalPaidThisMonth = roundCurrency(
    invoices
      .filter((inv) => inv.status === "PAID" && inv.paidAt && isThisMonth(inv.paidAt))
      .reduce((sum, inv) => sum + inv.total, 0)
  );

  // ---- Filtered list ----
  const filtered =
    statusFilter === "ALL"
      ? invoices
      : invoices.filter((inv) => inv.status === statusFilter);

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
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalOutstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Paid This Month</p>
            <p className="text-2xl font-bold text-success-foreground tabular-nums">
              {formatCurrency(totalPaidThisMonth)}
            </p>
          </CardContent>
        </Card>
      </div>

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
            {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Invoice
        </Button>
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
              {invoices.length === 0
                ? "No invoices yet. Create your first invoice to get started."
                : "No invoices match the current filter."}
            </p>
            {invoices.length === 0 && (
              <Button
                variant="secondary"
                className="mt-2"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Invoice
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
                      Invoice #
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
                      Due Date
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted/50"
                      onClick={() => router.push(`/invoices/${invoice.id}`)}
                    >
                      <td className="px-4 py-3 font-medium">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {invoice.client?.name ?? "\u2014"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={INVOICE_STATUS[invoice.status].variant}>
                          {INVOICE_STATUS[invoice.status].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {invoice.lineItems.length}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(invoice.createdAt)}
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
          {filtered.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              onClick={() => router.push(`/invoices/${invoice.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create invoice modal */}
      {createModalOpen && (
        <CreateInvoiceModal
          clients={clients}
          onClose={() => setCreateModalOpen(false)}
          onCreated={(id) => {
            setCreateModalOpen(false);
            router.push(`/invoices/${id}`);
          }}
        />
      )}
    </div>
  );
}
