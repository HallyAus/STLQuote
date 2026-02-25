"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { roundCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Download,
  Send,
  CheckCircle,
  Ban,
} from "lucide-react";
import { BANNER } from "@/lib/status-colours";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  clientId: string | null;
  quoteId: string | null;
  jobId: string | null;
  subtotal: number;
  taxPct: number;
  tax: number;
  total: number;
  currency: string;
  notes: string | null;
  terms: string | null;
  dueDate: string | null;
  paidAt: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    billingAddress: string | null;
  } | null;
  lineItems: LineItem[];
  quote?: { id: string; quoteNumber: string } | null;
  job?: { id: string; status: string } | null;
}

interface LineItemFormData {
  description: string;
  quantity: string;
  unitPrice: string;
  notes: string;
}

const EMPTY_LINE_ITEM: LineItemFormData = {
  description: "",
  quantity: "1",
  unitPrice: "0",
  notes: "",
};

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

const ALL_STATUSES = Object.keys(INVOICE_STATUS) as InvoiceStatus[];

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

// ---------------------------------------------------------------------------
// Line Item Form Modal
// ---------------------------------------------------------------------------

function LineItemModal({
  title,
  form,
  onFieldChange,
  onSave,
  onClose,
  saving,
}: {
  title: string;
  form: LineItemFormData;
  onFieldChange: (field: keyof LineItemFormData, value: string) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  const qty = parseInt(form.quantity) || 1;
  const unitPrice = parseFloat(form.unitPrice) || 0;
  const lineTotal = roundCurrency(unitPrice * qty);

  return (
    <Dialog open={true} onClose={onClose}>
      <DialogHeader onClose={onClose}>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <Input
          label="Description *"
          value={form.description}
          onChange={(e) => onFieldChange("description", e.target.value)}
          placeholder="e.g. Custom 3D printed bracket"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Quantity"
            type="number"
            min="1"
            step="1"
            value={form.quantity}
            onChange={(e) => onFieldChange("quantity", e.target.value)}
          />
          <Input
            label="Unit Price ($)"
            type="number"
            min="0"
            step="0.01"
            value={form.unitPrice}
            onChange={(e) => onFieldChange("unitPrice", e.target.value)}
          />
        </div>

        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => onFieldChange("notes", e.target.value)}
          placeholder="Optional notes for this line item..."
          className="min-h-[60px]"
        />

        <div className="rounded-md bg-primary/10 px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground">Line Total</p>
          <p className="text-lg font-bold text-primary">
            {formatCurrency(lineTotal)}
          </p>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Line Item"
            )}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function InvoiceDetail() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [taxPct, setTaxPct] = useState("10");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  // Client assignment
  const [clients, setClients] = useState<{ id: string; name: string; company: string | null }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");

  // Send state
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  // Line item modal
  const [lineItemModalOpen, setLineItemModalOpen] = useState(false);
  const [editingLineItemId, setEditingLineItemId] = useState<string | null>(null);
  const [lineItemForm, setLineItemForm] = useState<LineItemFormData>(EMPTY_LINE_ITEM);
  const [lineItemSaving, setLineItemSaving] = useState(false);

  // ---- Fetch invoice ----
  const fetchInvoice = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/invoices/${invoiceId}`);
      if (!res.ok) throw new Error("Failed to fetch invoice");
      const data: Invoice = await res.json();
      setInvoice(data);
      setTaxPct(String(data.taxPct));
      setNotes(data.notes ?? "");
      setTerms(data.terms ?? "");
      setSelectedClientId(data.clientId ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // Fetch clients for dropdown
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

  // ---- Handlers ----

  async function handleStatusChange(newStatus: string) {
    if (!invoice) return;
    try {
      setError(null);
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await fetchInvoice();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleClientChange(newClientId: string) {
    setSelectedClientId(newClientId);
    try {
      setError(null);
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: newClientId || null }),
      });
      if (!res.ok) throw new Error("Failed to update client");
      await fetchInvoice();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleSaveInvoice() {
    if (!invoice) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxPct: parseFloat(taxPct) || 0,
          notes: notes.trim() || null,
          terms: terms.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update invoice");
      await fetchInvoice();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteInvoice() {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    try {
      setError(null);
      const res = await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete invoice");
      router.push("/invoices");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleMarkAsPaid() {
    if (!invoice) return;
    if (!confirm("Mark this invoice as paid?")) return;
    try {
      setError(null);
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      if (!res.ok) throw new Error("Failed to mark as paid");
      await fetchInvoice();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleVoidInvoice() {
    if (!invoice) return;
    if (!confirm("Void this invoice? This marks it as cancelled.")) return;
    try {
      setError(null);
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "VOID" }),
      });
      if (!res.ok) throw new Error("Failed to void invoice");
      await fetchInvoice();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  // ---- Send invoice ----

  async function handleSendInvoice() {
    if (!invoice) return;
    if (!invoice.client?.email) {
      setError("Client has no email address. Assign a client with an email first.");
      return;
    }
    if (!confirm(`Send invoice ${invoice.invoiceNumber} to ${invoice.client.email}?`)) return;

    try {
      setSending(true);
      setError(null);
      setSendSuccess(null);
      const res = await fetch(`/api/invoices/${invoiceId}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invoice");
      setSendSuccess(data.message);
      await fetchInvoice();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSending(false);
    }
  }

  // ---- Line item handlers ----

  function openAddLineItem() {
    setEditingLineItemId(null);
    setLineItemForm(EMPTY_LINE_ITEM);
    setLineItemModalOpen(true);
  }

  function openEditLineItem(item: LineItem) {
    setEditingLineItemId(item.id);
    setLineItemForm({
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      notes: item.notes ?? "",
    });
    setLineItemModalOpen(true);
  }

  function closeLineItemModal() {
    setLineItemModalOpen(false);
    setEditingLineItemId(null);
    setLineItemForm(EMPTY_LINE_ITEM);
  }

  function updateLineItemField(field: keyof LineItemFormData, value: string) {
    setLineItemForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSaveLineItem() {
    if (!lineItemForm.description.trim()) {
      setError("Description is required");
      return;
    }

    const qty = parseInt(lineItemForm.quantity) || 1;
    const unitPrice = parseFloat(lineItemForm.unitPrice) || 0;
    const lineTotal = roundCurrency(unitPrice * qty);

    const payload = {
      description: lineItemForm.description.trim(),
      quantity: qty,
      unitPrice: roundCurrency(unitPrice),
      lineTotal,
      notes: lineItemForm.notes.trim() || null,
    };

    try {
      setLineItemSaving(true);
      setError(null);

      const url = editingLineItemId
        ? `/api/invoices/${invoiceId}/line-items/${editingLineItemId}`
        : `/api/invoices/${invoiceId}/line-items`;
      const method = editingLineItemId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error ||
            `Failed to ${editingLineItemId ? "update" : "create"} line item`
        );
      }

      closeLineItemModal();
      await fetchInvoice();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLineItemSaving(false);
    }
  }

  async function handleDeleteLineItem(lineItemId: string) {
    if (!confirm("Delete this line item?")) return;
    try {
      setError(null);
      const res = await fetch(
        `/api/invoices/${invoiceId}/line-items/${lineItemId}`,
        { method: "DELETE" }
      );
      if (!res.ok && res.status !== 204)
        throw new Error("Failed to delete line item");
      await fetchInvoice();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  // ---- Calculate totals ----
  const subtotal = invoice
    ? roundCurrency(
        invoice.lineItems.reduce((sum, item) => sum + item.lineTotal, 0)
      )
    : 0;
  const currentTaxPct = parseFloat(taxPct) || 0;
  const tax = roundCurrency(subtotal * currentTaxPct / 100);
  const total = roundCurrency(subtotal + tax);

  // ---- Client options ----
  const clientOptions = [
    { value: "", label: "-- No client --" },
    ...clients.map((c) => ({
      value: c.id,
      label: c.company ? `${c.name} (${c.company})` : c.name,
    })),
  ];

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Invoice not found.</p>
        <Button variant="secondary" onClick={() => router.push("/invoices")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Invoices
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/invoices")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Invoices
      </Button>

      {/* Success banner */}
      {sendSuccess && (
        <div className={BANNER.success}>
          {sendSuccess}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className={BANNER.error}>
          {error}
        </div>
      )}

      {/* Header section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-2xl">{invoice.invoiceNumber}</CardTitle>
              <div className="mt-2 w-56">
                <Select
                  label="Client"
                  options={clientOptions}
                  value={selectedClientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {invoice.quote && (
                <Badge
                  variant="info"
                  className="cursor-pointer"
                  onClick={() => router.push(`/quotes/${invoice.quote!.id}`)}
                >
                  {invoice.quote.quoteNumber}
                </Badge>
              )}
              <Select
                value={invoice.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                options={ALL_STATUSES.map((s) => ({
                  value: s,
                  label: INVOICE_STATUS[s].label,
                }))}
                className="w-36"
              />
              <Badge variant={INVOICE_STATUS[invoice.status].variant}>
                {INVOICE_STATUS[invoice.status].label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">{formatDate(invoice.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Due Date</p>
              <p className="font-medium">{formatDate(invoice.dueDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Sent</p>
              <p className="font-medium">{formatDate(invoice.sentAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Paid</p>
              <p className="font-medium">{formatDate(invoice.paidAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line items section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button size="sm" onClick={openAddLineItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Line Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {invoice.lineItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <p className="text-sm text-muted-foreground">
                No line items yet. Add your first item to this invoice.
              </p>
              <Button variant="secondary" size="sm" onClick={openAddLineItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Line Item
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-3 py-2 font-medium text-muted-foreground">
                        Description
                      </th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                        Qty
                      </th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                        Unit Price
                      </th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                        Total
                      </th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lineItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-3 py-2 font-medium">
                          {item.description}
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.notes}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">
                          {formatCurrency(item.lineTotal)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditLineItem(item)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteLineItem(item.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {invoice.lineItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{item.description}</p>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      <p className="shrink-0 font-semibold text-primary">
                        {formatCurrency(item.lineTotal)}
                      </p>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Qty: {item.quantity}</span>
                      <span>Unit: {formatCurrency(item.unitPrice)}</span>
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditLineItem(item)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLineItem(item.id)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Totals section */}
      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums font-medium">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">GST %</span>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={taxPct}
                onChange={(e) => setTaxPct(e.target.value)}
                className="w-24 text-right"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                GST ({currentTaxPct}%)
              </span>
              <span className="tabular-nums font-medium">
                {formatCurrency(tax)}
              </span>
            </div>
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold text-primary tabular-nums">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes section */}
      <Card>
        <CardHeader>
          <CardTitle>Notes & Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Invoice notes..."
            />
            <Textarea
              label="Payment Terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Payment terms for this invoice..."
            />
            <div className="flex justify-end">
              <Button onClick={handleSaveInvoice} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-6">
          <Button onClick={handleSendInvoice} disabled={sending}>
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send Invoice
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.open(`/api/invoices/${invoiceId}/pdf`, "_blank")}
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          {invoice.status !== "PAID" && invoice.status !== "VOID" && (
            <Button variant="secondary" onClick={handleMarkAsPaid}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Paid
            </Button>
          )}
          {invoice.status !== "VOID" && (
            <Button variant="secondary" onClick={handleVoidInvoice}>
              <Ban className="mr-2 h-4 w-4" />
              Void
            </Button>
          )}
          <Button
            variant="ghost"
            className="text-destructive-foreground hover:bg-destructive/10"
            onClick={handleDeleteInvoice}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Invoice
          </Button>
        </CardContent>
      </Card>

      {/* Line item modal */}
      {lineItemModalOpen && (
        <LineItemModal
          title={editingLineItemId ? "Edit Line Item" : "Add Line Item"}
          form={lineItemForm}
          onFieldChange={updateLineItemField}
          onSave={handleSaveLineItem}
          onClose={closeLineItemModal}
          saving={lineItemSaving}
        />
      )}
    </div>
  );
}
