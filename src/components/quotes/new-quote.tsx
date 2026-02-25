"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Calculator, UserPlus, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

function readCalculatorData(): CalculatorLineItem | null {
  try {
    const raw = sessionStorage.getItem("calculatorToQuote");
    if (!raw) return null;
    const data = JSON.parse(raw) as CalculatorLineItem;
    if (
      typeof data.description !== "string" ||
      typeof data.lineTotal !== "number"
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewQuote() {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  const [calcLineItem, setCalcLineItem] = useState<CalculatorLineItem | null>(
    null
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load clients on mount
  useEffect(() => {
    async function loadClients() {
      try {
        const res = await fetch("/api/clients");
        if (res.ok) {
          const data = await res.json();
          setClients(
            data.map((c: { id: string; name: string; company: string | null }) => ({
              id: c.id,
              name: c.name,
              company: c.company,
            }))
          );
        }
      } catch {
        // ignore — clients list will be empty
      } finally {
        setLoadingClients(false);
      }
    }
    loadClients();
  }, []);

  // Read calculator data from sessionStorage when arriving from calculator
  useEffect(() => {
    if (searchParams.get("fromCalculator") === "true") {
      const data = readCalculatorData();
      if (data) {
        setCalcLineItem(data);
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

  async function handleCreate() {
    if (!selectedClientId) {
      setError("Please select a client before creating a quote.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const lineItems = calcLineItem
        ? [
            {
              description: calcLineItem.description,
              printWeightG: calcLineItem.printWeightG,
              printTimeMinutes: calcLineItem.printTimeMinutes,
              materialCost: calcLineItem.materialCost,
              machineCost: calcLineItem.machineCost,
              labourCost: calcLineItem.labourCost,
              overheadCost: calcLineItem.overheadCost,
              lineTotal: calcLineItem.lineTotal,
              quantity: calcLineItem.quantity,
            },
          ]
        : [];

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
              <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                {error}
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
            {calcLineItem && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Calculator className="h-4 w-4" />
                  Line item from Calculator
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Description</span>
                  <span className="text-foreground">
                    {calcLineItem.description}
                  </span>
                  <span>Material cost</span>
                  <span className="font-mono text-foreground">
                    {formatAUD(calcLineItem.materialCost)}
                  </span>
                  <span>Machine cost</span>
                  <span className="font-mono text-foreground">
                    {formatAUD(calcLineItem.machineCost)}
                  </span>
                  <span>Labour cost</span>
                  <span className="font-mono text-foreground">
                    {formatAUD(calcLineItem.labourCost)}
                  </span>
                  <span>Overhead cost</span>
                  <span className="font-mono text-foreground">
                    {formatAUD(calcLineItem.overheadCost)}
                  </span>
                  <span>Quantity</span>
                  <span className="text-foreground">
                    {calcLineItem.quantity}
                  </span>
                  <span className="font-semibold">Unit price</span>
                  <span className="font-mono font-semibold text-primary">
                    {formatAUD(calcLineItem.lineTotal)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCalcLineItem(null)}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Remove line item
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

            {!calcLineItem && (
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
