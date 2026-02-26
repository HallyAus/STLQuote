"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Calculator, UserPlus, X, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { getEffectiveTier, hasFeature } from "@/lib/tier";
import { BANNER } from "@/lib/status-colours";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateOption {
  id: string;
  name: string;
  lineItems: string | null;
  markupPct: number;
  notes: string | null;
  terms: string | null;
}

interface CalculatorLineItem {
  description: string;
  printWeightG: number;
  printTimeMinutes: number;
  materialCost: number;
  machineCost: number;
  labourCost: number;
  overheadCost: number;
  lineTotal: number;
  quantity: number;
}

interface ClientOption {
  id: string;
  name: string;
  company: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultExpiryDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

function formatAUD(value: number): string {
  return `$${value.toFixed(2)}`;
}

function readCalculatorData(): CalculatorLineItem[] {
  try {
    const raw = sessionStorage.getItem("calculatorToQuote");
    if (!raw) return [];
    const data = JSON.parse(raw);

    // Multi-item format: { items: [...] }
    if (data.items && Array.isArray(data.items)) {
      return data.items.filter(
        (item: CalculatorLineItem) =>
          typeof item.description === "string" &&
          typeof item.lineTotal === "number"
      );
    }

    // Legacy single-item format
    if (
      typeof data.description === "string" &&
      typeof data.lineTotal === "number"
    ) {
      return [data as CalculatorLineItem];
    }

    return [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewQuote() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  // AI assistant (Pro only)
  const user = session?.user as {
    role?: string;
    subscriptionTier?: string;
    subscriptionStatus?: string;
    trialEndsAt?: string | null;
  } | undefined;
  const isPro = user
    ? hasFeature(
        getEffectiveTier({
          subscriptionTier: user.subscriptionTier ?? "free",
          subscriptionStatus: user.subscriptionStatus ?? "",
          trialEndsAt: user.trialEndsAt ?? null,
          role: user.role,
        }),
        "ai_assistant"
      )
    : false;
  const [showAiDraft, setShowAiDraft] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  // Client state
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  // Quote fields
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [expiryDate, setExpiryDate] = useState(defaultExpiryDate());
  const [markupPct, setMarkupPct] = useState("50");

  const [calcLineItems, setCalcLineItems] = useState<CalculatorLineItem[]>([]);

  const [templates, setTemplates] = useState<TemplateOption[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load clients and templates on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [clientsRes, templatesRes] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/quote-templates"),
        ]);
        if (clientsRes.ok) {
          const data = await clientsRes.json();
          setClients(
            data.map((c: { id: string; name: string; company: string | null }) => ({
              id: c.id,
              name: c.name,
              company: c.company,
            }))
          );
        }
        if (templatesRes.ok) {
          const data = await templatesRes.json();
          setTemplates(data);
        }
      } catch {
        // ignore — lists will be empty
      } finally {
        setLoadingClients(false);
      }
    }
    loadData();
  }, []);

  // Read calculator data from sessionStorage when arriving from calculator
  useEffect(() => {
    if (searchParams.get("fromCalculator") === "true") {
      const items = readCalculatorData();
      if (items.length > 0) {
        setCalcLineItems(items);
        setMarkupPct("0");
      }
      sessionStorage.removeItem("calculatorToQuote");
    }
  }, [searchParams]);

  async function handleQuickCreateClient() {
    if (!newClientName.trim()) return;
    setCreatingClient(true);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClientName.trim(),
          email: newClientEmail.trim() || null,
          phone: newClientPhone.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to create client");
      }
      const created = await res.json();
      setClients((prev) => [
        ...prev,
        { id: created.id, name: created.name, company: created.company },
      ]);
      setSelectedClientId(created.id);
      setShowNewClient(false);
      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setCreatingClient(false);
    }
  }

  async function handleAiDraft() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setError(null);
    setAiExplanation(null);
    try {
      const res = await fetch("/api/ai/quote-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (res.status === 403 && body?.code === "PRO_REQUIRED") {
          throw new Error("AI Quote Assistant requires a Pro subscription.");
        }
        throw new Error(body?.error || "Failed to generate quote draft");
      }
      const data = await res.json();
      if (data.lineItems?.length > 0) {
        setCalcLineItems(data.lineItems);
        setMarkupPct("0"); // AI already calculated full costs
      }
      if (data.explanation) {
        setAiExplanation(data.explanation);
      }
      setShowAiDraft(false);
      setAiPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI draft failed");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleCreate() {
    if (!selectedClientId) {
      setError("Please select a client before creating a quote.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const lineItems = calcLineItems.map((item) => ({
        description: item.description,
        printWeightG: item.printWeightG,
        printTimeMinutes: item.printTimeMinutes,
        materialCost: item.materialCost,
        machineCost: item.machineCost,
        labourCost: item.labourCost,
        overheadCost: item.overheadCost,
        lineTotal: item.lineTotal,
        quantity: item.quantity,
      }));

      const payload = {
        clientId: selectedClientId,
        notes: notes.trim() || null,
        terms: terms.trim() || null,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        markupPct: parseFloat(markupPct) || 50,
        lineItems,
      };

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to create quote");
      }

      const created = await res.json();
      router.push(`/quotes/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  const clientOptions = [
    { value: "", label: loadingClients ? "Loading clients..." : "-- Select a client --" },
    ...clients.map((c) => ({
      value: c.id,
      label: c.company ? `${c.name} (${c.company})` : c.name,
    })),
  ];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/quotes")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Quotes
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>New Quote</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Error banner */}
            {error && (
              <div className={BANNER.error}>
                {error}
              </div>
            )}

            {/* ---- Template selector + AI Draft ---- */}
            {calcLineItems.length === 0 && (
              <div className="flex items-end gap-3">
                {templates.length > 0 && (
                  <div className="flex-1">
                    <Select
                      label="Start from Template"
                      value=""
                      onChange={(e) => {
                        const t = templates.find((tpl) => tpl.id === e.target.value);
                        if (!t) return;
                        setMarkupPct(String(t.markupPct));
                        if (t.notes) setNotes(t.notes);
                        if (t.terms) setTerms(t.terms);
                        if (t.lineItems) {
                          try {
                            const items = JSON.parse(t.lineItems) as CalculatorLineItem[];
                            setCalcLineItems(items);
                          } catch {
                            // ignore parse errors
                          }
                        }
                      }}
                      options={[
                        { value: "", label: "-- None (blank quote) --" },
                        ...templates.map((t) => ({ value: t.id, label: t.name })),
                      ]}
                    />
                  </div>
                )}
                {isPro && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowAiDraft(true)}
                    className="mb-0.5 shrink-0"
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    AI Draft
                  </Button>
                )}
              </div>
            )}

            {/* ---- AI Draft dialog ---- */}
            {showAiDraft && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Sparkles className="h-4 w-4" />
                    AI Quote Assistant
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowAiDraft(false); setAiPrompt(""); }}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Describe the print job in plain English and AI will generate line items with estimated costs.
                </p>
                <Textarea
                  placeholder="e.g. 50x phone stands in black PETG, each about 30g, plus 10x cable clips in TPU..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowAiDraft(false); setAiPrompt(""); }}
                    disabled={aiLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAiDraft}
                    disabled={aiLoading || !aiPrompt.trim()}
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        Generate Draft
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* AI explanation note */}
            {aiExplanation && (
              <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                <div className="flex-1">{aiExplanation}</div>
                <button
                  type="button"
                  onClick={() => setAiExplanation(null)}
                  className="shrink-0 rounded p-0.5 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* ---- Client selector (required, first thing) ---- */}
            <div className="space-y-2">
              <Select
                label="Client *"
                options={clientOptions}
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  setError(null);
                }}
                disabled={loadingClients}
              />

              {!showNewClient ? (
                <button
                  type="button"
                  onClick={() => setShowNewClient(true)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <UserPlus className="h-3 w-3" />
                  Create new client
                </button>
              ) : (
                <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      New Client
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewClient(false);
                        setNewClientName("");
                        setNewClientEmail("");
                        setNewClientPhone("");
                      }}
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Input
                    label="Name *"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Client name"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Email"
                      type="email"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      placeholder="Optional"
                    />
                    <Input
                      label="Phone"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleQuickCreateClient}
                    disabled={creatingClient || !newClientName.trim()}
                  >
                    {creatingClient ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Client"
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Calculator line item preview */}
            {calcLineItems.length > 0 && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Calculator className="h-4 w-4" />
                  {calcLineItems.length === 1
                    ? "Line item from Calculator"
                    : `${calcLineItems.length} line items from Calculator`}
                </div>
                {calcLineItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground"
                  >
                    <span>Description</span>
                    <span className="text-foreground">
                      {item.description}
                    </span>
                    <span>Material cost</span>
                    <span className="font-mono text-foreground">
                      {formatAUD(item.materialCost)}
                    </span>
                    <span>Machine cost</span>
                    <span className="font-mono text-foreground">
                      {formatAUD(item.machineCost)}
                    </span>
                    <span>Labour cost</span>
                    <span className="font-mono text-foreground">
                      {formatAUD(item.labourCost)}
                    </span>
                    <span>Overhead cost</span>
                    <span className="font-mono text-foreground">
                      {formatAUD(item.overheadCost)}
                    </span>
                    <span>Quantity</span>
                    <span className="text-foreground">
                      {item.quantity}
                    </span>
                    <span className="font-semibold">Unit price</span>
                    <span className="font-mono font-semibold text-primary">
                      {formatAUD(item.lineTotal)}
                    </span>
                    {calcLineItems.length > 1 && (
                      <>
                        <span />
                        <button
                          type="button"
                          onClick={() =>
                            setCalcLineItems((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="text-left text-xs text-muted-foreground underline hover:text-foreground"
                        >
                          Remove
                        </button>
                      </>
                    )}
                    {idx < calcLineItems.length - 1 && (
                      <div className="col-span-2 my-1 border-t border-border/50" />
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setCalcLineItems([])}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  {calcLineItems.length === 1 ? "Remove line item" : "Remove all line items"}
                </button>
              </div>
            )}

            {/* Expiry date */}
            <Input
              label="Expiry Date"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />

            {/* Markup */}
            <Input
              label="Markup %"
              type="number"
              min="0"
              step="1"
              value={markupPct}
              onChange={(e) => setMarkupPct(e.target.value)}
            />

            {/* Notes */}
            <Textarea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this quote..."
            />

            {/* Terms */}
            <Textarea
              label="Terms & Conditions"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Optional terms and conditions..."
            />

            {calcLineItems.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Line items can be added after creating the quote.
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => router.push("/quotes")}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={saving || !selectedClientId}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Quote"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
