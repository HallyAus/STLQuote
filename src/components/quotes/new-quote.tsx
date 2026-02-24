"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns an ISO date string 30 days from now (YYYY-MM-DD for the input) */
function defaultExpiryDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewQuote() {
  const router = useRouter();

  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [expiryDate, setExpiryDate] = useState(defaultExpiryDate());
  const [markupPct, setMarkupPct] = useState("50");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    try {
      setSaving(true);
      setError(null);

      const payload = {
        notes: notes.trim() || null,
        terms: terms.trim() || null,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        markupPct: parseFloat(markupPct) || 50,
        lineItems: [],
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
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Notes
              </label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about this quote..."
              />
            </div>

            {/* Terms */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Terms & Conditions
              </label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Optional terms and conditions..."
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Line items can be added after creating the quote.
            </p>

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
