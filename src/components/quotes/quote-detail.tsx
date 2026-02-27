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
  Briefcase,
  Send,
  Copy,
  History,
  Receipt,
  Eye,
  Bookmark,
  UserPlus,
} from "lucide-react";
import { QUOTE_STATUS, BANNER, type QuoteStatus } from "@/lib/status-colours";
import { QuoteTimeline } from "@/components/quotes/quote-timeline";
import { QuotePreview } from "@/components/quotes/quote-preview";

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
  clientId: string | null;
  subtotal: number;
  markupPct: number;
  taxPct: number;
  taxLabel: string;
  tax: number;
  taxInclusive: boolean;
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
    email: string | null;
  } | null;
  lineItems: LineItem[];
  jobs?: { id: string; status: string }[];
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

const ALL_STATUSES = Object.keys(QUOTE_STATUS) as QuoteStatus[];

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
        <Input
          label="Description *"
          value={form.description}
          onChange={(e) => onFieldChange("description", e.target.value)}
          placeholder="e.g. Custom bracket — PLA"
        />

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

        <Input
          label="Quantity"
          type="number"
          min="1"
          step="1"
          value={form.quantity}
          onChange={(e) => onFieldChange("quantity", e.target.value)}
        />

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
            {formatCurrency(previewTotal)}
            {qty > 1 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                x {qty} = {formatCurrency(previewTotal * qty)}
              </span>
            )}
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
  const [taxPct, setTaxPct] = useState("0");
  const [taxLabel, setTaxLabel] = useState("GST");
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  // Client assignment
  const [clients, setClients] = useState<{ id: string; name: string; company: string | null }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  // Send quote state
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  // Duplicate state
  const [duplicating, setDuplicating] = useState(false);

  // Preview modal
  const [previewOpen, setPreviewOpen] = useState(false);

  // Convert to job modal
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [printers, setPrinters] = useState<{ id: string; name: string }[]>([]);
  const [jobPrinterId, setJobPrinterId] = useState("");
  const [jobNotes, setJobNotes] = useState("");
  const [convertSaving, setConvertSaving] = useState(false);

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
      setTaxPct(String(data.taxPct ?? 0));
      setTaxLabel(data.taxLabel ?? "GST");
      setTaxInclusive(data.taxInclusive ?? false);
      setNotes(data.notes ?? "");
      setTerms(data.terms ?? "");
      setSelectedClientId(data.clientId ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  // Fetch clients and printers for dropdowns
  useEffect(() => {
    async function loadDropdownData() {
      const [clientsRes, printersRes] = await Promise.all([
        fetch("/api/clients").catch(() => null),
        fetch("/api/printers").catch(() => null),
      ]);
      if (clientsRes?.ok) {
        const data = await clientsRes.json();
        setClients(
          data.map((c: { id: string; name: string; company: string | null }) => ({
            id: c.id,
            name: c.name,
            company: c.company,
          }))
        );
      }
      if (printersRes?.ok) {
        const data = await printersRes.json();
        setPrinters(
          data.map((p: { id: string; name: string }) => ({
            id: p.id,
            name: p.name,
          }))
        );
      }
    }
    loadDropdownData();
  }, []);

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

  async function handleClientChange(newClientId: string) {
    setSelectedClientId(newClientId);
    try {
      setError(null);
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: newClientId || null }),
      });
      if (!res.ok) throw new Error("Failed to update client");
      await fetchQuote();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleQuickCreateClient() {
    if (!newClientName.trim()) return;
    setCreatingClient(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClientName.trim(),
          email: newClientEmail.trim() || null,
        }),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created?.error || "Failed to create client");
      setClients((prev) => [
        ...prev,
        { id: created.id, name: created.name, company: created.company ?? null },
      ]);
      setShowNewClient(false);
      setNewClientName("");
      setNewClientEmail("");
      await handleClientChange(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setCreatingClient(false);
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
          taxPct: parseFloat(taxPct) || 0,
          taxLabel: taxLabel.trim() || "GST",
          taxInclusive,
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

  // ---- Send quote ----

  async function handleSendQuote() {
    if (!quote) return;
    if (!quote.client?.email) {
      setError("Client has no email address. Assign a client with an email first.");
      return;
    }
    if (!confirm(`Send quote ${quote.quoteNumber} to ${quote.client.email}?`)) return;

    try {
      setSending(true);
      setError(null);
      setSendSuccess(null);
      const res = await fetch(`/api/quotes/${quoteId}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send quote");
      setSendSuccess(data.message);
      await fetchQuote();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSending(false);
    }
  }

  // ---- Duplicate quote ----

  async function handleDuplicateQuote() {
    if (!quote) return;
    try {
      setDuplicating(true);
      setError(null);
      const res = await fetch(`/api/quotes/${quoteId}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to duplicate quote");
      router.push(`/quotes/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDuplicating(false);
    }
  }

  // ---- Convert to job ----

  async function handleConvertToJob() {
    try {
      setConvertSaving(true);
      setError(null);
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId,
          printerId: jobPrinterId || null,
          notes: jobNotes.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to create job");
      }
      setConvertModalOpen(false);
      setJobPrinterId("");
      setJobNotes("");
      await fetchQuote();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setConvertSaving(false);
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
  const currentTaxPct = parseFloat(taxPct) || 0;
  const subtotalWithMarkup = roundCurrency(subtotal * (1 + markup / 100));
  const tax = roundCurrency(subtotalWithMarkup * currentTaxPct / 100);
  const total = taxInclusive ? subtotalWithMarkup : roundCurrency(subtotalWithMarkup + tax);

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

  const jobCount = quote.jobs?.length ?? 0;

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

      {/* Header + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Header + metadata */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-2xl">{quote.quoteNumber}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {jobCount > 0 && (
                  <Badge
                    variant="info"
                    className="cursor-pointer"
                    onClick={() => router.push("/jobs")}
                  >
                    <Briefcase className="mr-1 h-3 w-3" />
                    {jobCount} job{jobCount !== 1 ? "s" : ""}
                  </Badge>
                )}
                <Badge variant={QUOTE_STATUS[quote.status].variant}>
                  {QUOTE_STATUS[quote.status].label}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Select
                  label="Client"
                  options={clientOptions}
                  value={selectedClientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                />
                {!showNewClient ? (
                  <button
                    type="button"
                    onClick={() => setShowNewClient(true)}
                    className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <UserPlus className="h-3 w-3" />
                    Create new client
                  </button>
                ) : (
                  <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">New Client</p>
                      <button
                        type="button"
                        onClick={() => { setShowNewClient(false); setNewClientName(""); setNewClientEmail(""); }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                    <Input
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Client name *"
                    />
                    <Input
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      placeholder="Email (optional)"
                      type="email"
                    />
                    <Button
                      size="sm"
                      onClick={handleQuickCreateClient}
                      disabled={creatingClient || !newClientName.trim()}
                    >
                      {creatingClient ? "Creating..." : "Create Client"}
                    </Button>
                  </div>
                )}
              </div>
              <Select
                label="Status"
                value={quote.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                options={ALL_STATUSES.map((s) => ({
                  value: s,
                  label: QUOTE_STATUS[s].label,
                }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
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

        {/* Right: Activity timeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[260px] overflow-y-auto">
            <QuoteTimeline quoteId={quoteId} />
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-6">
          <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Preview Quote
          </Button>
          <Button onClick={handleSendQuote} disabled={sending}>
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send Quote
          </Button>
          {quote.status === "ACCEPTED" && (
            <>
              <Button onClick={() => setConvertModalOpen(true)}>
                <Briefcase className="mr-2 h-4 w-4" />
                Convert to Job
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/invoices", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ quoteId: quote.id }),
                    });
                    if (!res.ok) throw new Error("Failed to create invoice");
                    const inv = await res.json();
                    router.push(`/invoices/${inv.id}`);
                  } catch {
                    // Best-effort — errors will show on the invoices page
                  }
                }}
              >
                <Receipt className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            onClick={() => window.open(`/api/quotes/${quoteId}/pdf`, "_blank")}
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button
            variant="secondary"
            onClick={handleDuplicateQuote}
            disabled={duplicating}
          >
            {duplicating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Duplicate
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                const res = await fetch("/api/quote-templates", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: `Template from ${quote.quoteNumber}`,
                    lineItems: JSON.stringify(
                      quote.lineItems.map((li) => ({
                        description: li.description,
                        printWeightG: li.printWeightG,
                        printTimeMinutes: li.printTimeMinutes,
                        materialCost: li.materialCost,
                        machineCost: li.machineCost,
                        labourCost: li.labourCost,
                        overheadCost: li.overheadCost,
                        lineTotal: li.lineTotal,
                        quantity: li.quantity,
                        notes: li.notes,
                      }))
                    ),
                    markupPct: quote.markupPct,
                    terms: quote.terms,
                    notes: quote.notes,
                  }),
                });
                if (!res.ok) throw new Error("Failed");
                alert("Template saved!");
              } catch {
                setError("Failed to save as template");
              }
            }}
          >
            <Bookmark className="mr-2 h-4 w-4" />
            Save as Template
          </Button>
          <Button
            variant="ghost"
            className="text-destructive-foreground hover:bg-destructive/10"
            onClick={handleDeleteQuote}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Quote
          </Button>
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
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{taxLabel} %</span>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={taxPct}
                onChange={(e) => setTaxPct(e.target.value)}
                className="w-24 text-right"
              />
            </div>
            {currentTaxPct > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {taxLabel} ({currentTaxPct}%){taxInclusive ? " (incl.)" : ""}
                </span>
                <span className="tabular-nums font-medium">
                  {formatCurrency(tax)}
                </span>
              </div>
            )}
            {currentTaxPct > 0 && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxInclusive}
                  onChange={(e) => setTaxInclusive(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <span className="text-xs text-muted-foreground">Tax inclusive</span>
              </label>
            )}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold text-primary tabular-nums">
                  {formatCurrency(total)}
                  {taxInclusive && currentTaxPct > 0 && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      incl. {formatCurrency(tax)} {taxLabel}
                    </span>
                  )}
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

      {/* Quote preview modal */}
      <QuotePreview
        quote={quote}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onSend={() => {
          setPreviewOpen(false);
          handleSendQuote();
        }}
        sending={sending}
      />

      {/* Convert to Job modal */}
      {convertModalOpen && (
        <Dialog open={true} onClose={() => setConvertModalOpen(false)}>
          <DialogHeader onClose={() => setConvertModalOpen(false)}>
            <DialogTitle>Convert to Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground">Quote</p>
              <p className="text-sm text-muted-foreground">
                {quote.quoteNumber}
                {quote.client ? ` — ${quote.client.name}` : ""}
              </p>
            </div>

            <Select
              label="Printer (optional)"
              value={jobPrinterId}
              onChange={(e) => setJobPrinterId(e.target.value)}
              options={[
                { value: "", label: "-- Select printer --" },
                ...printers.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />

            <Textarea
              label="Notes"
              value={jobNotes}
              onChange={(e) => setJobNotes(e.target.value)}
              placeholder="Job notes..."
            />

            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setConvertModalOpen(false)}
                disabled={convertSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleConvertToJob} disabled={convertSaving}>
                {convertSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Job"
                )}
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}
    </div>
  );
}
