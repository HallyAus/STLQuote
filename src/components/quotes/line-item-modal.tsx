"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { roundCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface LineItemFormData {
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

export const EMPTY_LINE_ITEM: LineItemFormData = {
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

export function calcLineTotal(form: LineItemFormData): number {
  return roundCurrency(
    (parseFloat(form.materialCost) || 0) +
      (parseFloat(form.machineCost) || 0) +
      (parseFloat(form.labourCost) || 0) +
      (parseFloat(form.overheadCost) || 0)
  );
}

function formatCurrency(value: number): string {
  return `$${roundCurrency(value).toFixed(2)}`;
}

interface LineItemModalProps {
  title: string;
  form: LineItemFormData;
  onFieldChange: (field: keyof LineItemFormData, value: string) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}

export function LineItemModal({
  title,
  form,
  onFieldChange,
  onSave,
  onClose,
  saving,
}: LineItemModalProps) {
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
            onChange={(e) => onFieldChange("printTimeMinutes", e.target.value)}
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
