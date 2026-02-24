"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Calculator } from "lucide-react";

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns an ISO date string 30 days from now (YYYY-MM-DD for the input) */
function defaultExpiryDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

function formatAUD(value: number): string {
  return `$${value.toFixed(2)}`;
}

/** Try to read and parse calculator data from sessionStorage. Returns null on failure. */
function readCalculatorData(): CalculatorLineItem | null {
  try {
    const raw = sessionStorage.getItem("calculatorToQuote");
    if (!raw) return null;
    const data = JSON.parse(raw) as CalculatorLineItem;
    // Basic shape validation
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

  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [expiryDate, setExpiryDate] = useState(defaultExpiryDate());
  const [markupPct, setMarkupPct] = useState("50");

  const [calcLineItem, setCalcLineItem] = useState<CalculatorLineItem | null>(
    null
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read calculator data from sessionStorage when arriving from calculator
  useEffect(() => {
    if (searchParams.get("fromCalculator") === "true") {
      const data = readCalculatorData();
      if (data) {
        setCalcLineItem(data);
        // Set markup to 0 since the calculator already applied markup
        setMarkupPct("0");
      }
      // Clean up — only use once
      sessionStorage.removeItem("calculatorToQuote");
    }
  }, [searchParams]);

  async function handleCreate() {
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
              <Button onClick={handleCreate} disabled={saving}>
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
