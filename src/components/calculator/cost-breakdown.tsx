"use client";

import { type CostBreakdown } from "@/lib/calculator";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";

interface CostBreakdownPanelProps {
  breakdown: CostBreakdown;
  markupPct: number;
  onCreateQuote?: () => void;
}

function formatAUD(value: number): string {
  return `$${value.toFixed(2)}`;
}

interface CostBarProps {
  label: string;
  value: number;
  total: number;
  colour: string;
}

function CostBar({ label, value, total, colour }: CostBarProps) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">
          {formatAUD(value)} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-300", colour)}
          style={{ width: `${Math.max(pct, 0.5)}%` }}
        />
      </div>
    </div>
  );
}

export function CostBreakdownPanel({
  breakdown,
  markupPct,
  onCreateQuote,
}: CostBreakdownPanelProps) {
  const {
    materialCost,
    machineCost,
    labourCost,
    overheadCost,
    subtotal,
    markup,
    rushSurcharge,
    unitPrice,
    totalPrice,
    quantity,
  } = breakdown;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cost Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cost bar chart */}
        <div className="space-y-3">
          <CostBar
            label="Material"
            value={materialCost}
            total={subtotal}
            colour="bg-chart-1"
          />
          <CostBar
            label="Machine"
            value={machineCost}
            total={subtotal}
            colour="bg-chart-2"
          />
          <CostBar
            label="Labour"
            value={labourCost}
            total={subtotal}
            colour="bg-chart-4"
          />
          <CostBar
            label="Overhead"
            value={overheadCost}
            total={subtotal}
            colour="bg-chart-3"
          />
        </div>

        {/* Line items */}
        <div className="space-y-2 border-t border-border pt-4">
          <LineItem label="Material cost" value={materialCost} />
          <LineItem label="Machine cost" value={machineCost} />
          <LineItem label="Labour cost" value={labourCost} />
          <LineItem label="Overhead cost" value={overheadCost} />

          <div className="flex items-center justify-between border-t border-border pt-2 font-semibold">
            <span>Subtotal</span>
            <span className="font-mono">{formatAUD(subtotal)}</span>
          </div>

          <LineItem
            label={`Markup (${markupPct}%)`}
            value={markup}
            className="text-muted-foreground"
          />

          {rushSurcharge > 0 && (
            <LineItem
              label="Rush surcharge"
              value={rushSurcharge}
              className="text-destructive-foreground"
            />
          )}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-lg font-semibold">Unit price</span>
            <span className="text-xl font-bold font-mono text-primary">
              {formatAUD(unitPrice)}
            </span>
          </div>

          {quantity > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {quantity} x {formatAUD(unitPrice)}
              </span>
              <span className="font-mono">{formatAUD(totalPrice)}</span>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg bg-primary/10 p-3 mt-2">
            <span className="text-xl font-bold">Total</span>
            <span className="text-2xl font-bold font-mono text-primary">
              {formatAUD(totalPrice)}
            </span>
          </div>
        </div>

        {onCreateQuote && (
          <Button
            className="w-full mt-2"
            onClick={onCreateQuote}
          >
            <FileText className="mr-2 h-4 w-4" />
            Create Quote
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function LineItem({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between text-sm", className)}>
      <span>{label}</span>
      <span className="font-mono">{formatAUD(value)}</span>
    </div>
  );
}
