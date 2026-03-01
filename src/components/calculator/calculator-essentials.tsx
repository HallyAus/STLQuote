"use client";

import { type CalculatorInput } from "@/lib/calculator";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileUp } from "lucide-react";

interface PrinterOption {
  id: string;
  name: string;
  model: string | null;
}

interface MaterialOption {
  id: string;
  materialType: string;
  brand: string | null;
  colour: string | null;
}

interface CalculatorEssentialsProps {
  input: CalculatorInput;
  printers: PrinterOption[];
  materials: MaterialOption[];
  selectedPrinterId: string;
  selectedMaterialId: string;
  onPrinterSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onMaterialSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onFieldChange: <
    S extends keyof CalculatorInput,
    K extends keyof CalculatorInput[S],
  >(section: S, key: K) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasFileEstimates: boolean;
}

function materialLabel(m: MaterialOption): string {
  const parts = [m.materialType];
  if (m.brand) parts.push(m.brand);
  if (m.colour) parts.push(m.colour);
  return parts.join(" - ");
}

export function CalculatorEssentials({
  input,
  printers,
  materials,
  selectedPrinterId,
  selectedMaterialId,
  onPrinterSelect,
  onMaterialSelect,
  onFieldChange,
  hasFileEstimates,
}: CalculatorEssentialsProps) {
  const printerSelectOptions = [
    { value: "", label: "Manual entry" },
    ...(printers.length === 0
      ? [{ value: "__no_printers", label: "No printers \u2014 add one" }]
      : printers.map((p) => ({ value: p.id, label: p.name }))),
  ];

  const materialSelectOptions = [
    { value: "", label: "Manual entry" },
    ...(materials.length === 0
      ? [{ value: "__no_materials", label: "No materials \u2014 add one" }]
      : materials.map((m) => ({ value: m.id, label: materialLabel(m) }))),
  ];

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Job Details</h3>
          {hasFileEstimates && (
            <Badge variant="info" className="gap-1">
              <FileUp className="h-3 w-3" />
              Auto-filled from file
            </Badge>
          )}
        </div>

        {/* Row 1: Printer + Material */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Printer"
            id="printer-select"
            options={printerSelectOptions}
            value={selectedPrinterId}
            onChange={onPrinterSelect}
          />
          <Select
            label="Material"
            id="material-select"
            options={materialSelectOptions}
            value={selectedMaterialId}
            onChange={onMaterialSelect}
          />
        </div>

        {/* Row 2: Print Weight + Print Time */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Print weight (g)"
            hint="Weight of the printed part in grams — auto-filled from your STL or G-code file"
            type="number"
            step="0.1"
            value={input.material.printWeightG}
            onChange={onFieldChange("material", "printWeightG")}
          />
          <Input
            label="Print time (min)"
            hint="Estimated print time in minutes — auto-filled from G-code or estimated from STL volume"
            type="number"
            step="1"
            value={input.machine.printTimeMinutes}
            onChange={onFieldChange("machine", "printTimeMinutes")}
          />
        </div>

        {/* Row 3: Quantity + Markup */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Quantity"
            hint="Number of copies to produce"
            type="number"
            step="1"
            min="1"
            value={input.pricing.quantity}
            onChange={onFieldChange("pricing", "quantity")}
          />
          <Input
            label="Markup (%)"
            hint="Your profit margin applied on top of all production costs"
            type="number"
            step="1"
            value={input.pricing.markupPct}
            onChange={onFieldChange("pricing", "markupPct")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
