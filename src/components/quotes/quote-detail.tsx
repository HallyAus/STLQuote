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
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";

interface LineItem {
  id: string;
  description: string;
  printWeightG: number;
  printTimeMinutes: number;
  materialCost: number;
  machineCost: number;
  labourCost: number;
  overheadCost: number;
  lineTotal: number;
  quantity: number;
  notes: string | null;
}

interface Quote {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  subtotal: number;
  markupPct: number;
  total: number;
  currency: string;
  notes: string | null;
  terms: string | null;
  expiryDate: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
  } | null;
  lineItems: LineItem[];
}

interface LineItemFormData {
  description: string;
  printWeightG: string;
  printTimeMinutes: string;
  materialCost: string;
  machineCost: string;
  labourCost: string;
  overheadCost: string;
  quantity: string;
  notes: string;
}

const EMPTY_LINE_ITEM: LineItemFormData = {
  description: "",
  printWeightG: "0",
  printTimeMinutes: "0",
  materialCost: "0",
  machineCost: "0",
  labourCost: "0",
  overheadCost: "0",
  quantity: "1",
  notes: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_STATUSES: QuoteStatus[] = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
];

const STATUS_LABEL: Record<QuoteStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

const STATUS_VARIANT: Record<QuoteStatus, "default" | "info" | "success" | "destructive" | "warning"> = {
  DRAFT: "default",
  SENT: "info",
  ACCEPTED: "success",
  REJECTED: "destructive",
  EXPIRED: "warning",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number): string {
  return `$${roundCurrency(value).toFixed(2)}`;
}

function calcLineTotal(form: LineItemFormData): number {
  return roundCurrency(
    (parseFloat(form.materialCost) || 0) +
      (parseFloat(form.machineCost) || 0) +
      (parseFloat(form.labourCost) || 0) +
      (parseFloat(form.overheadCost) || 0)
  );
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
  const previewTotal = calcLineTotal(form);
  const qty = parseInt(form.quantity) || 1;

  return (
    <Dialog open={true} onClose={onClose}>
      <DialogHeader onClose={onClose}>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Description */}
        <Input
          label="Description *"
          value={form.description}
          onChange={(e) => onFieldChange("description", e.target.value)}
          placeholder="e.g. Custom bracket — PLA"
        />

        {/* Print weight & time */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Print Weight (g)"
            type="number"
            min="0"
            step="0.1"
            value={form.printWeightG}
            onChange={(e) => onFieldChange("printWeightG", e.target.value)}
          />
          <Input
            label="Print Time (min)"
            type="number"
            min="0"
            step="1"
            value={form.printTimeMinutes}
            onChange={(e) =>
              onFieldChange("printTimeMinutes", e.target.value)
            }
          />
        </div>

        {/* Cost fields */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Material Cost ($)"
            type="number"
            min="0"
            step="0.01"
            value={form.materialCost}
            onChange={(e) => onFieldChange("materialCost", e.target.value)}
          />
          <Input
            label="Machine Cost ($)"
            type="number"
            min="0"
            step="0.01"
            value={form.machineCost}
            onChange={(e) => onFieldChange("machineCost", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Labour Cost ($)"
            type="number"
            min="0"
            step="0.01"
            value={form.labourCost}
            onChange={(e) => onFieldChange("labourCost", e.target.value)}
          />
          <Input
            label="Overhead Cost ($)"
            type="number"
            min="0"
            step="0.01"
            value={form.overheadCost}
            onChange={(e) => onFieldChange("overheadCost", e.target.value)}
          />
        </div>

        {/* Quantity */}
        <Input
          label="Quantity"
          type="number"
          min="1"
          step="1"
          value={form.quantity}
          onChange={(e) => onFieldChange("quantity", e.target.value)}
        />

        {/* Notes */}
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => onFieldChange("notes", e.target.value)}
          placeholder="Optional notes for this line item..."
          className="min-h-[60px]"
        />

        {/* Preview total */}
        <div className="rounded-md bg-primary/10 px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground">Line Total</p>
          <p className="text-lg font-bold text-primary">
            {formatCurrency(previewTotal)}
            {qty > 1 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                x {qty} = {formatCurrency(previewTotal * qty)}
              </span>
            )}
          </p>
        </div>

        {/* Actions */}
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

export function QuoteDetail() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [markupPct, setMarkupPct] = useState("0");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  // Line item modal
  const [lineItemModalOpen, setLineItemModalOpen] = useState(false);
  const [editingLineItemId, setEditingLineItemId] = useState<string | null>(
    null
  );
  const [lineItemForm, setLineItemForm] =
    useState<LineItemFormData>(EMPTY_LINE_ITEM);
  const [lineItemSaving, setLineItemSaving] = useState(false);

  // ---- Fetch quote ----
  const fetchQuote = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/quotes/${quoteId}`);
      if (!res.ok) throw new Error("Failed to fetch quote");
      const data: Quote = await res.json();
      setQuote(data);
      setMarkupPct(String(data.markupPct));
      setNotes(data.notes ?? "");
      setTerms(data.terms ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  // ---- Handlers ----

  async function handleStatusChange(newStatus: string) {
    if (!quote) return;
    try {
      setError(null);
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await fetchQuote();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleSaveQuote() {
    if (!quote) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markupPct: parseFloat(markupPct) || 0,
          notes: notes.trim() || null,
          terms: terms.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update quote");
      await fetchQuote();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteQuote() {
    if (!confirm("Delete this quote? This cannot be undone.")) return;
    try {
      setError(null);
      const res = await fetch(`/api/quotes/${quoteId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete quote");
      router.push("/quotes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
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
      printWeightG: String(item.printWeightG),
      printTimeMinutes: String(item.printTimeMinutes),
      materialCost: String(item.materialCost),
      machineCost: String(item.machineCost),
      labourCost: String(item.labourCost),
      overheadCost: String(item.overheadCost),
      quantity: String(item.quantity),
      notes: item.notes ?? "",
    });
    setLineItemModalOpen(true);
  }

  function closeLineItemModal() {
    setLineItemModalOpen(false);
    setEditingLineItemId(null);
    setLineItemForm(EMPTY_LINE_ITEM);
  }

  function updateLineItemField(
    field: keyof LineItemFormData,
    value: string
  ) {
    setLineItemForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSaveLineItem() {
    if (!lineItemForm.description.trim()) {
      setError("Description is required");
      return;
    }

    const lineTotal = calcLineTotal(lineItemForm);
    const payload = {
      description: lineItemForm.description.trim(),
      printWeightG: parseFloat(lineItemForm.printWeightG) || 0,
      printTimeMinutes: parseFloat(lineItemForm.printTimeMinutes) || 0,
      materialCost: parseFloat(lineItemForm.materialCost) || 0,
      machineCost: parseFloat(lineItemForm.machineCost) || 0,
      labourCost: parseFloat(lineItemForm.labourCost) || 0,
      overheadCost: parseFloat(lineItemForm.overheadCost) || 0,
      lineTotal,
      quantity: parseInt(lineItemForm.quantity) || 1,
      notes: lineItemForm.notes.trim() || null,
    };

    try {
      setLineItemSaving(true);
      setError(null);

      const url = editingLineItemId
        ? `/api/quotes/${quoteId}/line-items/${editingLineItemId}`
        : `/api/quotes/${quoteId}/line-items`;
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
      await fetchQuote();
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
        `/api/quotes/${quoteId}/line-items/${lineItemId}`,
        { method: "DELETE" }
      );
      if (!res.ok && res.status !== 204)
        throw new Error("Failed to delete line item");
      await fetchQuote();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  // ---- Calculate totals ----
  const subtotal = quote
    ? roundCurrency(
        quote.lineItems.reduce(
          (sum, item) => sum + item.lineTotal * item.quantity,
          0
        )
      )
    : 0;
  const markup = parseFloat(markupPct) || 0;
  const total = roundCurrency(subtotal * (1 + markup / 100));

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Quote not found.</p>
        <Button variant="secondary" onClick={() => router.push("/quotes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Quotes
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
        onClick={() => router.push("/quotes")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Quotes
      </Button>

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Header section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-2xl">{quote.quoteNumber}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {quote.client?.name ?? "No client"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={quote.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                options={ALL_STATUSES.map((s) => ({
                  value: s,
                  label: STATUS_LABEL[s],
                }))}
                className="w-36"
              />
              <Badge variant={STATUS_VARIANT[quote.status]}>
                {STATUS_LABEL[quote.status]}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">{formatDate(quote.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Expiry</p>
              <p className="font-medium">{formatDate(quote.expiryDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Currency</p>
              <p className="font-medium">{quote.currency}</p>
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
          {quote.lineItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <p className="text-sm text-muted-foreground">
                No line items yet. Add your first item to this quote.
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
                        Weight (g)
                      </th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                        Time (min)
                      </th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                        Material
                      </th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                        Machine
                      </th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                        Labour
                      </th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                        Overhead
                      </th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                        Qty
                      </th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                        Line Total
                      </th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.lineItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-3 py-2 font-medium">
                          {item.description}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {item.printWeightG}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {item.printTimeMinutes}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatCurrency(item.materialCost)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatCurrency(item.machineCost)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatCurrency(item.labourCost)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatCurrency(item.overheadCost)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">
                          {formatCurrency(item.lineTotal * item.quantity)}
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
                {quote.lineItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{item.description}</p>
                      <p className="shrink-0 font-semibold text-primary">
                        {formatCurrency(item.lineTotal * item.quantity)}
                      </p>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Material: {formatCurrency(item.materialCost)}
                      </span>
                      <span>Machine: {formatCurrency(item.machineCost)}</span>
                      <span>Labour: {formatCurrency(item.labourCost)}</span>
                      <span>
                        Overhead: {formatCurrency(item.overheadCost)}
                      </span>
                      <span>Weight: {item.printWeightG}g</span>
                      <span>Time: {item.printTimeMinutes}min</span>
                      <span>Qty: {item.quantity}</span>
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
              <span className="text-muted-foreground">Markup %</span>
              <Input
                type="number"
                min="0"
                step="1"
                value={markupPct}
                onChange={(e) => setMarkupPct(e.target.value)}
                className="w-24 text-right"
              />
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
              placeholder="Internal notes about this quote..."
            />
            <Textarea
              label="Terms & Conditions"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Terms and conditions for this quote..."
            />
            <div className="flex justify-end">
              <Button onClick={handleSaveQuote} disabled={saving}>
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
          <Button
            variant="secondary"
            onClick={() => router.push(`/quotes/${quoteId}/pdf`)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button
            variant="ghost"
            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
            onClick={handleDeleteQuote}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Quote
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
