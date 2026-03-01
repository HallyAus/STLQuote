"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  type CalculatorInput,
  calculateTotalCost,
} from "@/lib/calculator";
import { type BatchTier } from "@/lib/batch-pricing";
import { CostBreakdownPanel } from "@/components/calculator/cost-breakdown";
import { STLUploadPanel, type FileEstimates } from "@/components/calculator/stl-upload-panel";
import { PresetBar, type CalculatorPreset } from "@/components/calculator/preset-bar";
import { CalculatorEssentials } from "@/components/calculator/calculator-essentials";
import { CalculatorAdvanced } from "@/components/calculator/calculator-advanced";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

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
  shipping: {
    shippingCostPerUnit: 0,
    packagingCostPerUnit: 0,
  },
};

// ---------------------------------------------------------------------------
// Calculator Form
// ---------------------------------------------------------------------------

export interface CalculatorLineItem {
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

interface CalculatorFormProps {
  onAddToQuote?: (items: CalculatorLineItem[]) => void;
}

export function CalculatorForm({ onAddToQuote }: CalculatorFormProps = {}) {
  const router = useRouter();
  const [input, setInput] = useState<CalculatorInput>(defaultInput);
  const [printers, setPrinters] = useState<PrinterOption[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>("");
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
  const [fileEstimatesList, setFileEstimatesList] = useState<FileEstimates[]>([]);
  const [batchTiers, setBatchTiers] = useState<BatchTier[] | null>(null);

  // Preset state
  const [presets, setPresets] = useState<CalculatorPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [savingPreset, setSavingPreset] = useState(false);
  const [deletingPreset, setDeletingPreset] = useState(false);

  // Fetch printers, materials, and settings in parallel on mount
  useEffect(() => {
    Promise.all([
      fetch("/api/printers").then((r) => r.ok ? r.json() : []),
      fetch("/api/materials").then((r) => r.ok ? r.json() : []),
      fetch("/api/settings").then((r) => r.ok ? r.json() : null),
    ]).then(([printersData, materialsData, settingsData]) => {
      if (Array.isArray(printersData)) setPrinters(printersData);
      if (Array.isArray(materialsData)) setMaterials(materialsData);
      if (settingsData?.defaultElectricityRate != null) {
        setInput((prev) => ({
          ...prev,
          machine: { ...prev.machine, electricityRate: settingsData.defaultElectricityRate },
        }));
      }
      if (settingsData?.batchPricingTiers) {
        try {
          const tiers = JSON.parse(settingsData.batchPricingTiers);
          if (Array.isArray(tiers) && tiers.length > 0) setBatchTiers(tiers);
        } catch { /* ignore */ }
      }
    }).catch(() => {});
  }, []);

  const fetchPresets = useCallback(() => {
    fetch("/api/calculator-presets")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPresets(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const breakdown = useMemo(() => calculateTotalCost(input, batchTiers), [input, batchTiers]);

  // -----------------------------------------------------------------------
  // File upload handler (STL or G-code)
  // -----------------------------------------------------------------------

  function handleFileAdded(estimates: FileEstimates) {
    setFileEstimatesList((prev) => {
      const idx = prev.findIndex((f) => f.filename === estimates.filename);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = estimates;
        return updated;
      }
      return [...prev, estimates];
    });

    setInput((prev) => ({
      ...prev,
      material: {
        ...prev.material,
        printWeightG: estimates.weightG || prev.material.printWeightG,
      },
      machine: {
        ...prev.machine,
        printTimeMinutes: estimates.printTimeMinutes || prev.machine.printTimeMinutes,
      },
    }));

    // G-code: auto-select matching material
    if (estimates.type === "gcode" && estimates.materialType) {
      const matchingMaterial = materials.find(
        (m) => m.materialType.toUpperCase() === estimates.materialType!.toUpperCase()
      );
      if (matchingMaterial) {
        setSelectedMaterialId(matchingMaterial.id);
        setInput((prev) => ({
          ...prev,
          material: {
            ...prev.material,
            spoolPrice: matchingMaterial.price,
            spoolWeightG: matchingMaterial.spoolWeightG,
            printWeightG: estimates.weightG || prev.material.printWeightG,
          },
        }));
      }
    }
  }

  function handleFileRemoved(filename: string) {
    setFileEstimatesList((prev) => prev.filter((f) => f.filename !== filename));
  }

  // -----------------------------------------------------------------------
  // Field helpers
  // -----------------------------------------------------------------------

  function handleChange<
    S extends keyof CalculatorInput,
    K extends keyof CalculatorInput[S],
  >(section: S, key: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const num = parseFloat(e.target.value);
      if (isNaN(num)) return;
      setInput((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [key]: num,
        },
      }));
    };
  }

  // -----------------------------------------------------------------------
  // Printer / Material selectors
  // -----------------------------------------------------------------------

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

  // -----------------------------------------------------------------------
  // Preset handlers
  // -----------------------------------------------------------------------

  function handleSelectPreset(id: string) {
    setSelectedPresetId(id);
    if (!id) return;

    const preset = presets.find((p) => p.id === id);
    if (!preset) return;

    setInput(preset.configJson);
    setSelectedPrinterId("");
    setSelectedMaterialId("");
  }

  async function handleSavePreset(name: string) {
    setSavingPreset(true);
    try {
      const res = await fetch("/api/calculator-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, configJson: input }),
      });

      if (!res.ok) return;

      const created: CalculatorPreset = await res.json();
      setPresets((prev) => [created, ...prev]);
      setSelectedPresetId(created.id);
    } catch {
      // silently fail
    } finally {
      setSavingPreset(false);
    }
  }

  async function handleDeletePreset(id: string) {
    setDeletingPreset(true);
    try {
      const res = await fetch(`/api/calculator-presets/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) return;

      setPresets((prev) => prev.filter((p) => p.id !== id));
      setSelectedPresetId("");
    } catch {
      // silently fail
    } finally {
      setDeletingPreset(false);
    }
  }

  // -----------------------------------------------------------------------
  // Create Quote handler
  // -----------------------------------------------------------------------

  function buildLineItems(): CalculatorLineItem[] {
    if (fileEstimatesList.length > 1) {
      return fileEstimatesList.map((fe) => {
        const perFileInput: CalculatorInput = {
          ...input,
          material: { ...input.material, printWeightG: fe.weightG },
          machine: { ...input.machine, printTimeMinutes: fe.printTimeMinutes },
        };
        const perFileCost = calculateTotalCost(perFileInput);

        let description = fe.filename;
        if (fe.type === "stl" && fe.dimensionsMm) {
          description = `${fe.filename} (${fe.dimensionsMm.x.toFixed(0)}\u00d7${fe.dimensionsMm.y.toFixed(0)}\u00d7${fe.dimensionsMm.z.toFixed(0)}mm)`;
        } else if (fe.type === "gcode" && fe.materialType) {
          description = `${fe.filename} (${fe.materialType})`;
        }

        return {
          description,
          printWeightG: fe.weightG,
          printTimeMinutes: fe.printTimeMinutes,
          materialCost: perFileCost.materialCost,
          machineCost: perFileCost.machineCost,
          labourCost: perFileCost.labourCost,
          overheadCost: perFileCost.overheadCost,
          lineTotal: perFileCost.unitPrice,
          quantity: perFileCost.quantity,
        };
      });
    }

    const fe = fileEstimatesList[0] ?? null;
    let description = "Calculated print job";
    if (fe?.type === "stl" && fe.dimensionsMm) {
      description = `${fe.filename} (${fe.dimensionsMm.x.toFixed(0)}\u00d7${fe.dimensionsMm.y.toFixed(0)}\u00d7${fe.dimensionsMm.z.toFixed(0)}mm)`;
    } else if (fe?.type === "gcode") {
      description = `${fe.filename}${fe.materialType ? ` (${fe.materialType})` : ""}`;
    }

    return [{
      description,
      printWeightG: input.material.printWeightG,
      printTimeMinutes: input.machine.printTimeMinutes,
      materialCost: breakdown.materialCost,
      machineCost: breakdown.machineCost,
      labourCost: breakdown.labourCost,
      overheadCost: breakdown.overheadCost,
      lineTotal: breakdown.unitPrice,
      quantity: breakdown.quantity,
    }];
  }

  function handleCreateQuote() {
    const items = buildLineItems();

    if (onAddToQuote) {
      onAddToQuote(items);
      return;
    }

    if (items.length > 1) {
      sessionStorage.setItem("calculatorToQuote", JSON.stringify({ items }));
    } else {
      sessionStorage.setItem("calculatorToQuote", JSON.stringify(items[0]));
    }
    router.push("/quotes/new?fromCalculator=true");
  }

  function formatAUD(value: number): string {
    return `$${value.toFixed(2)}`;
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* File Upload Panel */}
      <STLUploadPanel onFileAdded={handleFileAdded} onFileRemoved={handleFileRemoved} />

      {/* Preset bar */}
      <PresetBar
        presets={presets}
        selectedPresetId={selectedPresetId}
        onSelectPreset={handleSelectPreset}
        onSavePreset={handleSavePreset}
        onDeletePreset={handleDeletePreset}
        saving={savingPreset}
        deleting={deletingPreset}
      />

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
        {/* Left column: essentials + advanced */}
        <div className="space-y-4">
          <CalculatorEssentials
            input={input}
            printers={printers}
            materials={materials}
            selectedPrinterId={selectedPrinterId}
            selectedMaterialId={selectedMaterialId}
            onPrinterSelect={handlePrinterSelect}
            onMaterialSelect={handleMaterialSelect}
            onFieldChange={handleChange}
            hasFileEstimates={fileEstimatesList.length > 0}
          />

          <CalculatorAdvanced
            input={input}
            onFieldChange={handleChange}
          />
        </div>

        {/* Right column: cost breakdown (sticky on desktop) */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <CostBreakdownPanel
            breakdown={breakdown}
            markupPct={input.pricing.markupPct}
            onCreateQuote={handleCreateQuote}
            stlFilename={
              fileEstimatesList.length > 1
                ? `${fileEstimatesList.length} files`
                : fileEstimatesList[0]?.filename
            }
            fileCount={fileEstimatesList.length}
            addToQuoteMode={!!onAddToQuote}
          />
        </div>
      </div>

      {/* Mobile floating price bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold font-mono text-primary">
              {formatAUD(breakdown.totalPrice)}
            </p>
          </div>
          <Button size="sm" onClick={handleCreateQuote}>
            {onAddToQuote ? (
              <>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add to Quote
              </>
            ) : (
              <>
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Create Quote
              </>
            )}
          </Button>
        </div>
      </div>
      {/* Spacer for mobile floating bar */}
      <div className="h-16 lg:hidden" />
    </div>
  );
}
