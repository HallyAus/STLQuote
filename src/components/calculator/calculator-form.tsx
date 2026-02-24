"use client";

import { useState, useEffect, useMemo } from "react";
import {
  type CalculatorInput,
  calculateTotalCost,
} from "@/lib/calculator";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CostBreakdownPanel } from "@/components/calculator/cost-breakdown";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface PrinterOption {
  id: string;
  name: string;
  model: string | null;
  purchasePrice: number;
  lifetimeHours: number;
  powerWatts: number;
  maintenanceCostPerHour: number;
}

interface MaterialOption {
  id: string;
  materialType: string;
  brand: string | null;
  colour: string | null;
  price: number;
  spoolWeightG: number;
}

const defaultInput: CalculatorInput = {
  material: {
    spoolPrice: 30,
    spoolWeightG: 1000,
    printWeightG: 50,
    supportWeightG: 0,
    wasteFactorPct: 10,
  },
  machine: {
    purchasePrice: 2000,
    lifetimeHours: 5000,
    printTimeMinutes: 120,
    powerWatts: 200,
    electricityRate: 0.3,
    maintenanceCostPerHour: 0.5,
  },
  labour: {
    designTimeMinutes: 0,
    designRate: 50,
    setupTimeMinutes: 15,
    postProcessingTimeMinutes: 15,
    packingTimeMinutes: 10,
    labourRate: 35,
  },
  overhead: {
    monthlyOverhead: 0,
    estimatedMonthlyJobs: 20,
  },
  pricing: {
    markupPct: 50,
    minimumCharge: 15,
    quantity: 1,
    rushMultiplier: 1.0,
  },
};

const selectClasses =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <h3 className="text-sm font-semibold">{title}</h3>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

export function CalculatorForm() {
  const [input, setInput] = useState<CalculatorInput>(defaultInput);
  const [printers, setPrinters] = useState<PrinterOption[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>("");
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");

  useEffect(() => {
    fetch("/api/printers")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPrinters(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/materials")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setMaterials(data);
      })
      .catch(() => {});
  }, []);

  const breakdown = useMemo(() => calculateTotalCost(input), [input]);

  function updateField<
    S extends keyof CalculatorInput,
    K extends keyof CalculatorInput[S],
  >(section: S, key: K, value: string) {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    setInput((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: num,
      },
    }));
  }

  function handleChange<
    S extends keyof CalculatorInput,
    K extends keyof CalculatorInput[S],
  >(section: S, key: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      updateField(section, key, e.target.value);
    };
  }

  function handlePrinterSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setSelectedPrinterId(id);

    if (!id) return;

    const printer = printers.find((p) => p.id === id);
    if (!printer) return;

    setInput((prev) => ({
      ...prev,
      machine: {
        ...prev.machine,
        purchasePrice: printer.purchasePrice,
        lifetimeHours: printer.lifetimeHours,
        powerWatts: printer.powerWatts,
        maintenanceCostPerHour: printer.maintenanceCostPerHour,
      },
    }));
  }

  function handleMaterialSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setSelectedMaterialId(id);

    if (!id) return;

    const material = materials.find((m) => m.id === id);
    if (!material) return;

    setInput((prev) => ({
      ...prev,
      material: {
        ...prev.material,
        spoolPrice: material.price,
        spoolWeightG: material.spoolWeightG,
      },
    }));
  }

  function materialLabel(m: MaterialOption): string {
    const parts = [m.materialType];
    if (m.brand) parts.push(m.brand);
    if (m.colour) parts.push(m.colour);
    return parts.join(" - ");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
      {/* Left column: form */}
      <div className="space-y-4">
        <Section title="Material Costs">
          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
            <label
              htmlFor="material-select"
              className="text-sm font-medium text-foreground"
            >
              Select a material
            </label>
            <select
              id="material-select"
              value={selectedMaterialId}
              onChange={handleMaterialSelect}
              className={selectClasses}
            >
              <option value="">Manual entry</option>
              {materials.length === 0 ? (
                <option disabled>No materials — add one</option>
              ) : (
                materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {materialLabel(m)}
                  </option>
                ))
              )}
            </select>
          </div>
          <Input
            label="Spool price (AUD)"
            type="number"
            step="0.01"
            value={input.material.spoolPrice}
            onChange={handleChange("material", "spoolPrice")}
          />
          <Input
            label="Spool weight (g)"
            type="number"
            step="1"
            value={input.material.spoolWeightG}
            onChange={handleChange("material", "spoolWeightG")}
          />
          <Input
            label="Print weight (g)"
            type="number"
            step="0.1"
            value={input.material.printWeightG}
            onChange={handleChange("material", "printWeightG")}
          />
          <Input
            label="Support weight (g)"
            type="number"
            step="0.1"
            value={input.material.supportWeightG}
            onChange={handleChange("material", "supportWeightG")}
          />
          <Input
            label="Waste factor (%)"
            type="number"
            step="1"
            value={input.material.wasteFactorPct}
            onChange={handleChange("material", "wasteFactorPct")}
          />
        </Section>

        <Section title="Machine Costs">
          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
            <label
              htmlFor="printer-select"
              className="text-sm font-medium text-foreground"
            >
              Select a printer
            </label>
            <select
              id="printer-select"
              value={selectedPrinterId}
              onChange={handlePrinterSelect}
              className={selectClasses}
            >
              <option value="">Manual entry</option>
              {printers.length === 0 ? (
                <option disabled>No printers — add one</option>
              ) : (
                printers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <Input
            label="Printer purchase price"
            type="number"
            step="1"
            value={input.machine.purchasePrice}
            onChange={handleChange("machine", "purchasePrice")}
          />
          <Input
            label="Lifetime hours"
            type="number"
            step="1"
            value={input.machine.lifetimeHours}
            onChange={handleChange("machine", "lifetimeHours")}
          />
          <Input
            label="Print time (minutes)"
            type="number"
            step="1"
            value={input.machine.printTimeMinutes}
            onChange={handleChange("machine", "printTimeMinutes")}
          />
          <Input
            label="Power (watts)"
            type="number"
            step="1"
            value={input.machine.powerWatts}
            onChange={handleChange("machine", "powerWatts")}
          />
          <Input
            label="Electricity rate ($/kWh)"
            type="number"
            step="0.01"
            value={input.machine.electricityRate}
            onChange={handleChange("machine", "electricityRate")}
          />
          <Input
            label="Maintenance ($/hr)"
            type="number"
            step="0.01"
            value={input.machine.maintenanceCostPerHour}
            onChange={handleChange("machine", "maintenanceCostPerHour")}
          />
        </Section>

        <Section title="Labour Costs">
          <Input
            label="Design time (min)"
            type="number"
            step="1"
            value={input.labour.designTimeMinutes}
            onChange={handleChange("labour", "designTimeMinutes")}
          />
          <Input
            label="Design rate ($/hr)"
            type="number"
            step="0.01"
            value={input.labour.designRate}
            onChange={handleChange("labour", "designRate")}
          />
          <Input
            label="Setup time (min)"
            type="number"
            step="1"
            value={input.labour.setupTimeMinutes}
            onChange={handleChange("labour", "setupTimeMinutes")}
          />
          <Input
            label="Post-processing time (min)"
            type="number"
            step="1"
            value={input.labour.postProcessingTimeMinutes}
            onChange={handleChange("labour", "postProcessingTimeMinutes")}
          />
          <Input
            label="Packing time (min)"
            type="number"
            step="1"
            value={input.labour.packingTimeMinutes}
            onChange={handleChange("labour", "packingTimeMinutes")}
          />
          <Input
            label="Labour rate ($/hr)"
            type="number"
            step="0.01"
            value={input.labour.labourRate}
            onChange={handleChange("labour", "labourRate")}
          />
        </Section>

        <Section title="Overhead" defaultOpen={false}>
          <Input
            label="Monthly overhead ($)"
            type="number"
            step="1"
            value={input.overhead.monthlyOverhead}
            onChange={handleChange("overhead", "monthlyOverhead")}
          />
          <Input
            label="Estimated monthly jobs"
            type="number"
            step="1"
            value={input.overhead.estimatedMonthlyJobs}
            onChange={handleChange("overhead", "estimatedMonthlyJobs")}
          />
        </Section>

        <Section title="Pricing">
          <Input
            label="Markup (%)"
            type="number"
            step="1"
            value={input.pricing.markupPct}
            onChange={handleChange("pricing", "markupPct")}
          />
          <Input
            label="Minimum charge ($)"
            type="number"
            step="0.01"
            value={input.pricing.minimumCharge}
            onChange={handleChange("pricing", "minimumCharge")}
          />
          <Input
            label="Quantity"
            type="number"
            step="1"
            min="1"
            value={input.pricing.quantity}
            onChange={handleChange("pricing", "quantity")}
          />
          <Input
            label="Rush multiplier"
            type="number"
            step="0.1"
            min="1"
            value={input.pricing.rushMultiplier}
            onChange={handleChange("pricing", "rushMultiplier")}
          />
        </Section>
      </div>

      {/* Right column: cost breakdown (sticky on desktop) */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <CostBreakdownPanel
          breakdown={breakdown}
          markupPct={input.pricing.markupPct}
        />
      </div>
    </div>
  );
}
