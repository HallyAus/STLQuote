"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { roundCurrency } from "@/lib/utils";
import { Plus, Pencil, Trash2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LineItem {
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

function formatCurrency(value: number): string {
  return `$${roundCurrency(value).toFixed(2)}`;
}

interface QuoteLineItemsProps {
  lineItems: LineItem[];
  onAddLineItem: () => void;
  onEditLineItem: (item: LineItem) => void;
  onDeleteLineItem: (lineItemId: string) => void;
}

export function QuoteLineItems({
  lineItems,
  onAddLineItem,
  onEditLineItem,
  onDeleteLineItem,
}: QuoteLineItemsProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <div className="flex items-center gap-2">
            {lineItems.length > 0 && (
              <button
                type="button"
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="hidden md:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={cn("h-3 w-3 transition-transform", showBreakdown && "rotate-180")} />
                {showBreakdown ? "Hide" : "Show"} cost breakdown
              </button>
            )}
            <Button size="sm" onClick={onAddLineItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Line Item
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {lineItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <p className="text-sm text-muted-foreground">
              No line items yet. Add your first item to this quote.
            </p>
            <Button variant="secondary" size="sm" onClick={onAddLineItem}>
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
                    {showBreakdown && (
                      <>
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
                      </>
                    )}
                    <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                      Qty
                    </th>
                    <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                      Unit Price
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
                  {lineItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-3 py-2 font-medium">
                        {item.description}
                      </td>
                      {showBreakdown && (
                        <>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {item.printWeightG}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {item.printTimeMinutes}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {formatCurrency(item.materialCost)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {formatCurrency(item.machineCost)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {formatCurrency(item.labourCost)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {formatCurrency(item.overheadCost)}
                          </td>
                        </>
                      )}
                      <td className="px-3 py-2 text-right tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(item.lineTotal)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        {formatCurrency(item.lineTotal * item.quantity)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEditLineItem(item)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteLineItem(item.id)}
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
              {lineItems.map((item) => (
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
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Qty: {item.quantity}</span>
                    <span>Unit: {formatCurrency(item.lineTotal)}</span>
                    <span>{item.printWeightG}g</span>
                    <span>{item.printTimeMinutes}min</span>
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditLineItem(item)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteLineItem(item.id)}
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
  );
}
