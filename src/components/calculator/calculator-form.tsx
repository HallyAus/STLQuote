"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  type CalculatorInput,
  calculateTotalCost,
} from "@/lib/calculator";
import { type BatchTier } from "@/lib/batch-pricing";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CostBreakdownPanel } from "@/components/calculator/cost-breakdown";
import { STLUploadPanel, type FileEstimates } from "@/components/calculator/stl-upload-panel";
import { cn } from "@/lib/utils";
import { ChevronDown, Save, FolderOpen, Trash2, Loader2 } from "lucide-react";

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

interface CalculatorPreset {
  id: string;
  name: string;
  configJson: CalculatorInput;
  createdAt: string;
  updatedAt: string;
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
};

// ---------------------------------------------------------------------------
// Collapsible Section
// ---------------------------------------------------------------------------

interface SectionProps {
  title: string;
  description?: string;
  accentColor?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({
  title,
  description,
  accentColor = "border-l-border",
  defaultOpen = true,
  children,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className={cn("border-l-[3px] overflow-hidden", accentColor)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="space-y-0.5">
          <h3 className="text-sm font-medium">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <CardContent className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Preset Bar (compact)
// ---------------------------------------------------------------------------

interface PresetBarProps {
  presets: CalculatorPreset[];
  selectedPresetId: string;
  onSelectPreset: (id: string) => void;
  onSavePreset: (name: string) => Promise<void>;
  onDeletePreset: (id: string) => Promise<void>;
  saving: boolean;
  deleting: boolean;
}

function PresetBar({
  presets,
  selectedPresetId,
  onSelectPreset,
  onSavePreset,
  onDeletePreset,
  saving,
  deleting,
}: PresetBarProps) {
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [presetName, setPresetName] = useState("");

  async function handleSave() {
    const trimmed = presetName.trim();
    if (!trimmed) return;
    await onSavePreset(trimmed);
    setPresetName("");
    setShowSaveForm(false);
  }

  const presetOptions = [
    { value: "", label: "Load a preset..." },
    ...presets.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <div className="rounded-lg border border-border bg-card/50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="w-48">
          <Select
            options={presetOptions}
            value={selectedPresetId}
            onChange={(e) => onSelectPreset(e.target.value)}
          />
        </div>

        {selectedPresetId && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeletePreset(selectedPresetId)}
            disabled={deleting}
            title="Delete preset"
            className="h-8 w-8"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            )}
          </Button>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowSaveForm(!showSaveForm)}
        >
          <Save className="mr-1.5 h-3 w-3" />
          Save
        </Button>

        {/* Inline save form */}
        {showSaveForm && (
          <>
            <div className="h-4 w-px bg-border" />
            <input
              type="text"
              placeholder="Preset name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setShowSaveForm(false);
              }}
              className="flex h-8 w-40 rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !presetName.trim()}
              className="h-8"
            >
              {saving ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Save className="mr-1 h-3 w-3" />
              )}
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowSaveForm(false);
                setPresetName("");
              }}
              className="h-8"
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calculator Form
// ---------------------------------------------------------------------------

export function CalculatorForm() {
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

  // Fetch printers, materials, and presets on mount
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

  // Fetch batch pricing tiers from settings
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.defaultElectricityRate != null) {
          setInput((prev) => ({
            ...prev,
            machine: { ...prev.machine, electricityRate: data.defaultElectricityRate },
          }));
        }
        if (data?.batchPricingTiers) {
          try {
            const tiers = JSON.parse(data.batchPricingTiers);
            if (Array.isArray(tiers) && tiers.length > 0) {
              setBatchTiers(tiers);
            }
          } catch {
            // Invalid JSON, ignore
          }
        }
      })
      .catch(() => {});
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

    // Populate form with latest file's values
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

    // G-code: try to auto-select matching material if one exists
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

  function materialLabel(m: MaterialOption): string {
    const parts = [m.materialType];
    if (m.brand) parts.push(m.brand);
    if (m.colour) parts.push(m.colour);
    return parts.join(" - ");
  }

  // Build options arrays for Select components
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

  // -----------------------------------------------------------------------
  // Preset handlers
  // -----------------------------------------------------------------------

  function handleSelectPreset(id: string) {
    setSelectedPresetId(id);
    if (!id) return;

    const preset = presets.find((p) => p.id === id);
    if (!preset) return;

    setInput(preset.configJson);
    // Clear printer/material selections since the preset has its own values
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
      // silently fail — network error
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

  function handleCreateQuote() {
    if (fileEstimatesList.length > 1) {
      // Multi-file: calculate costs per-file using each file's weight/time
      const items = fileEstimatesList.map((fe) => {
        const perFileInput: CalculatorInput = {
          ...input,
          material: {
            ...input.material,
            printWeightG: fe.weightG,
          },
          machine: {
            ...input.machine,
            printTimeMinutes: fe.printTimeMinutes,
          },
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

      sessionStorage.setItem(
        "calculatorToQuote",
        JSON.stringify({ items })
      );
    } else {
      // Single file or no file — legacy single item format
      const fe = fileEstimatesList[0] ?? null;
      let description = "Calculated print job";
      if (fe?.type === "stl" && fe.dimensionsMm) {
        description = `${fe.filename} (${fe.dimensionsMm.x.toFixed(0)}\u00d7${fe.dimensionsMm.y.toFixed(0)}\u00d7${fe.dimensionsMm.z.toFixed(0)}mm)`;
      } else if (fe?.type === "gcode") {
        description = `${fe.filename}${fe.materialType ? ` (${fe.materialType})` : ""}`;
      }

      const quoteData = {
        description,
        printWeightG: input.material.printWeightG,
        printTimeMinutes: input.machine.printTimeMinutes,
        materialCost: breakdown.materialCost,
        machineCost: breakdown.machineCost,
        labourCost: breakdown.labourCost,
        overheadCost: breakdown.overheadCost,
        lineTotal: breakdown.unitPrice,
        quantity: breakdown.quantity,
      };

      sessionStorage.setItem("calculatorToQuote", JSON.stringify(quoteData));
    }

    router.push("/quotes/new?fromCalculator=true");
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* File Upload Panel — full width (STL + G-code) */}
      <STLUploadPanel onFileAdded={handleFileAdded} onFileRemoved={handleFileRemoved} />

      {/* Preset bar — full width, compact */}
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
        {/* Left column: form */}
        <div className="space-y-4">
          <Section
            title="Material Costs"
            description="Filament spool and waste costs"
            accentColor="border-l-chart-1"
          >
            <div className="space-y-1 sm:col-span-2 lg:col-span-3">
              <Select
                label="Select a material"
                id="material-select"
                options={materialSelectOptions}
                value={selectedMaterialId}
                onChange={handleMaterialSelect}
              />
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

          <Section
            title="Machine Costs"
            description="Printer depreciation and energy costs"
            accentColor="border-l-chart-2"
          >
            <div className="space-y-1 sm:col-span-2 lg:col-span-3">
              <Select
                label="Select a printer"
                id="printer-select"
                options={printerSelectOptions}
                value={selectedPrinterId}
                onChange={handlePrinterSelect}
              />
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

          <Section
            title="Labour Costs"
            description="Design, setup, and post-processing time"
            accentColor="border-l-chart-4"
          >
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

          <Section
            title="Overhead"
            description="Fixed monthly business costs"
            accentColor="border-l-chart-3"
            defaultOpen={false}
          >
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

          <Section
            title="Pricing"
            description="Markup, quantity, and rush pricing"
            accentColor="border-l-primary"
          >
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
            onCreateQuote={handleCreateQuote}
            stlFilename={
              fileEstimatesList.length > 1
                ? `${fileEstimatesList.length} files`
                : fileEstimatesList[0]?.filename
            }
            fileCount={fileEstimatesList.length}
          />
        </div>
      </div>
    </div>
  );
}
