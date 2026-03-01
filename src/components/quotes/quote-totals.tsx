"use client";

import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { roundCurrency } from "@/lib/utils";

function formatCurrency(value: number): string {
  return `$${roundCurrency(value).toFixed(2)}`;
}

interface QuoteTotalsProps {
  subtotal: number;
  markupPct: string;
  taxPct: string;
  taxLabel: string;
  taxInclusive: boolean;
  onMarkupChange: (value: string) => void;
  onTaxPctChange: (value: string) => void;
  onTaxInclusiveChange: (value: boolean) => void;
}

export function QuoteTotals({
  subtotal,
  markupPct,
  taxPct,
  taxLabel,
  taxInclusive,
  onMarkupChange,
  onTaxPctChange,
  onTaxInclusiveChange,
}: QuoteTotalsProps) {
  const markup = parseFloat(markupPct) || 0;
  const currentTaxPct = parseFloat(taxPct) || 0;
  const subtotalWithMarkup = roundCurrency(subtotal * (1 + markup / 100));
  const tax = roundCurrency(subtotalWithMarkup * currentTaxPct / 100);
  const total = taxInclusive ? subtotalWithMarkup : roundCurrency(subtotalWithMarkup + tax);

  return (
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
              onChange={(e) => onMarkupChange(e.target.value)}
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
              onChange={(e) => onTaxPctChange(e.target.value)}
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
                onChange={(e) => onTaxInclusiveChange(e.target.checked)}
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
  );
}
