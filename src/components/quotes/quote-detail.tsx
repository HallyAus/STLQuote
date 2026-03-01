"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { roundCurrency } from "@/lib/utils";
import { ArrowLeft, Loader2 } from "lucide-react";
import { BANNER, type QuoteStatus } from "@/lib/status-colours";
import { QuotePreview } from "@/components/quotes/quote-preview";
import { QuoteHeader } from "@/components/quotes/quote-header";
import { QuoteActions } from "@/components/quotes/quote-actions";
import { QuoteLineItems, type LineItem } from "@/components/quotes/quote-line-items";
import { LineItemModal, type LineItemFormData, EMPTY_LINE_ITEM, calcLineTotal } from "@/components/quotes/line-item-modal";
import { QuoteTotals } from "@/components/quotes/quote-totals";
import { QuoteNotes } from "@/components/quotes/quote-notes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

  // Editable fields
  const [markupPct, setMarkupPct] = useState("0");
  const [taxPct, setTaxPct] = useState("0");
  const [taxLabel, setTaxLabel] = useState("GST");
  const [taxInclusive, setTaxInclusive] = useState(false);

  // Client assignment
  const [clients, setClients] = useState<{ id: string; name: string; company: string | null }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");

  // Action states
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Convert to job modal
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [printers, setPrinters] = useState<{ id: string; name: string }[]>([]);
  const [jobPrinterId, setJobPrinterId] = useState("");
  const [jobNotes, setJobNotes] = useState("");
  const [convertSaving, setConvertSaving] = useState(false);

  // Line item modal
  const [lineItemModalOpen, setLineItemModalOpen] = useState(false);
  const [editingLineItemId, setEditingLineItemId] = useState<string | null>(null);
  const [lineItemForm, setLineItemForm] = useState<LineItemFormData>(EMPTY_LINE_ITEM);
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
            company: c.company ?? null,
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

  async function handleCreateClient(name: string, email: string) {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email: email || null }),
    });
    const created = await res.json();
    if (!res.ok) throw new Error(created?.error || "Failed to create client");
    setClients((prev) => [
      ...prev,
      { id: created.id, name: created.name, company: created.company ?? null },
    ]);
    await handleClientChange(created.id);
  }

  async function handleSaveQuote(notes: string, terms: string) {
    if (!quote) return;
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
  }

  async function handleSaveTotals() {
    if (!quote) return;
    try {
      setError(null);
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markupPct: parseFloat(markupPct) || 0,
          taxPct: parseFloat(taxPct) || 0,
          taxLabel: taxLabel.trim() || "GST",
          taxInclusive,
        }),
      });
      if (!res.ok) throw new Error("Failed to update totals");
      await fetchQuote();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
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

  async function handleCreateInvoice() {
    if (!quote) return;
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
      setError("Failed to create invoice");
    }
  }

  async function handleSaveTemplate() {
    if (!quote) return;
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

      {/* Banners */}
      {sendSuccess && <div className={BANNER.success}>{sendSuccess}</div>}
      {error && <div className={BANNER.error}>{error}</div>}

      {/* Header + Activity */}
      <QuoteHeader
        quote={quote}
        quoteId={quoteId}
        clients={clients}
        selectedClientId={selectedClientId}
        onClientChange={handleClientChange}
        onStatusChange={handleStatusChange}
        onCreateClient={handleCreateClient}
        onNavigateJobs={() => router.push("/jobs")}
      />

      {/* Actions */}
      <QuoteActions
        quoteId={quoteId}
        status={quote.status}
        sending={sending}
        duplicating={duplicating}
        onPreview={() => setPreviewOpen(true)}
        onSend={handleSendQuote}
        onConvertToJob={() => setConvertModalOpen(true)}
        onCreateInvoice={handleCreateInvoice}
        onDownloadPDF={() => window.open(`/api/quotes/${quoteId}/pdf`, "_blank")}
        onDuplicate={handleDuplicateQuote}
        onSaveTemplate={handleSaveTemplate}
        onDelete={handleDeleteQuote}
      />

      {/* Line items */}
      <QuoteLineItems
        lineItems={quote.lineItems}
        onAddLineItem={openAddLineItem}
        onEditLineItem={openEditLineItem}
        onDeleteLineItem={handleDeleteLineItem}
      />

      {/* Totals */}
      <QuoteTotals
        subtotal={subtotal}
        markupPct={markupPct}
        taxPct={taxPct}
        taxLabel={taxLabel}
        taxInclusive={taxInclusive}
        onMarkupChange={(v) => { setMarkupPct(v); }}
        onTaxPctChange={(v) => { setTaxPct(v); }}
        onTaxInclusiveChange={(v) => { setTaxInclusive(v); }}
      />

      {/* Notes & Terms (auto-save) */}
      <QuoteNotes
        notes={quote.notes ?? ""}
        terms={quote.terms ?? ""}
        onSave={async (notes, terms) => {
          await handleSaveQuote(notes, terms);
        }}
      />

      {/* Line item modal */}
      {lineItemModalOpen && (
        <LineItemModal
          title={editingLineItemId ? "Edit Line Item" : "Add Line Item"}
          form={lineItemForm}
          onFieldChange={(field, value) =>
            setLineItemForm((prev) => ({ ...prev, [field]: value }))
          }
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
