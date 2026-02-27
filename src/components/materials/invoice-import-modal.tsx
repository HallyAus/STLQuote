"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Upload,
  FileText,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  PackagePlus,
  Link2,
  ArrowRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Material {
  id: string;
  type: string;
  materialType: string;
  brand: string | null;
  colour: string | null;
  spoolWeightG: number;
  price: number;
}

interface Consumable {
  id: string;
  name: string;
  category: string;
}

interface ParsedItem {
  type: "material" | "consumable" | "other";
  materialId: string | null;
  consumableId: string | null;
  description: string;
  quantity: number;
  unitCost: number;
  isNew: boolean;
  suggestedName: string | null;
  suggestedCategory: "material" | "consumable" | null;
}

interface ParsedInvoice {
  supplierName: string | null;
  invoiceNumber: string | null;
  expectedDelivery: string | null;
  items: ParsedItem[];
  notes: string | null;
}

type NewItemAction = "create" | "link";
type NewItemCategory = "material" | "consumable";

interface MaterialForm {
  type: string;
  materialType: string;
  brand: string;
  colour: string;
  spoolWeightG: number;
  price: number;
}

interface ConsumableForm {
  name: string;
  category: string;
  unitCost: string;
}

interface NewItemDecision {
  action: NewItemAction;
  category: NewItemCategory;
  materialForm: MaterialForm;
  consumableForm: ConsumableForm;
  linkedMaterialId: string;
  linkedConsumableId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MATERIAL_TYPES = ["PLA", "PETG", "ABS", "TPU", "ASA", "Nylon", "Resin", "Other"];
const CONSUMABLE_CATEGORIES = [
  { value: "nozzle", label: "Nozzle" },
  { value: "build_plate", label: "Build Plate" },
  { value: "belt", label: "Belt" },
  { value: "lubricant", label: "Lubricant" },
  { value: "other", label: "Other" },
];

function parseSuggestedMaterial(name: string): Partial<MaterialForm> {
  const upper = name.toUpperCase();
  const foundType = MATERIAL_TYPES.find((t) => upper.includes(t.toUpperCase()));
  return {
    materialType: foundType ?? "PLA",
    type: upper.includes("RESIN") ? "resin" : "filament",
  };
}

function findSimilarMaterials(name: string, existing: Material[]): Material[] {
  const words = name.toLowerCase().split(/[\s\-_,]+/).filter((w) => w.length > 2);
  return existing
    .filter((m) => {
      const target = `${m.materialType} ${m.brand ?? ""} ${m.colour ?? ""}`.toLowerCase();
      const matches = words.filter((w) => target.includes(w));
      return matches.length >= 2;
    })
    .slice(0, 3);
}

function findSimilarConsumables(name: string, existing: Consumable[]): Consumable[] {
  const words = name.toLowerCase().split(/[\s\-_,]+/).filter((w) => w.length > 2);
  return existing
    .filter((c) => {
      const target = c.name.toLowerCase();
      const matches = words.filter((w) => target.includes(w));
      return matches.length >= 1;
    })
    .slice(0, 3);
}

function makeDefaultDecision(item: ParsedItem): NewItemDecision {
  const cat: NewItemCategory = item.suggestedCategory === "material" ? "material" : "consumable";
  const parsed = parseSuggestedMaterial(item.suggestedName || item.description);
  return {
    action: "create",
    category: cat,
    materialForm: {
      type: parsed.type ?? "filament",
      materialType: parsed.materialType ?? "PLA",
      brand: "",
      colour: "",
      spoolWeightG: 1000,
      price: item.unitCost,
    },
    consumableForm: {
      name: item.suggestedName || item.description,
      category: "other",
      unitCost: item.unitCost.toString(),
    },
    linkedMaterialId: "",
    linkedConsumableId: "",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvoiceImportModal({
  onClose,
  onProductsCreated,
  existingMaterials,
}: {
  onClose: () => void;
  onProductsCreated: () => void;
  existingMaterials: Material[];
}) {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<"upload" | "review" | "creating" | "done">("upload");

  // Upload state
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Parsed data
  const [parsed, setParsed] = useState<ParsedInvoice | null>(null);

  // Consumables (lazy loaded for duplicate detection + linking)
  const [consumables, setConsumables] = useState<Consumable[]>([]);

  // Decisions for new items (keyed by item index in parsed.items)
  const [decisions, setDecisions] = useState<Map<number, NewItemDecision>>(new Map());

  // Creation state
  const [creating, setCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState({ current: 0, total: 0 });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState(0);
  // Map from original item index -> created product ID and type
  const [createdIds, setCreatedIds] = useState<Map<number, { id: string; type: "material" | "consumable" }>>(new Map());

  // Fetch consumables on mount for duplicate detection
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/consumables");
        if (res.ok) setConsumables(await res.json());
      } catch {
        // ignore
      }
    }
    load();
  }, []);

  // Derived
  const matchedItems = parsed?.items.filter((i) => !i.isNew) ?? [];
  const newItems = parsed?.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.isNew) ?? [];

  // ------ Handlers ------

  async function handleUpload(file: File) {
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setParseError("Unsupported file type. Use PNG, JPEG, WebP, GIF, or PDF.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setParseError("File too large. Maximum 20MB.");
      return;
    }

    setParsing(true);
    setParseError(null);
    setFileName(file.name);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/ai/parse-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64, mimeType: file.type }),
      });

      if (!res.ok) {
        const err = await res.json();
        setParseError(err.error || "Failed to parse invoice.");
        return;
      }

      const data: ParsedInvoice = await res.json();
      setParsed(data);

      // Build default decisions for new items
      const decs = new Map<number, NewItemDecision>();
      data.items.forEach((item, index) => {
        if (item.isNew) {
          decs.set(index, makeDefaultDecision(item));
        }
      });
      setDecisions(decs);
      setStep("review");
    } catch {
      setParseError("Failed to upload. Check your connection.");
    } finally {
      setParsing(false);
    }
  }

  function updateDecision(index: number, updates: Partial<NewItemDecision>) {
    setDecisions((prev) => {
      const next = new Map(prev);
      const existing = next.get(index);
      if (existing) next.set(index, { ...existing, ...updates });
      return next;
    });
  }

  function updateMaterialForm(index: number, field: keyof MaterialForm, value: string | number) {
    setDecisions((prev) => {
      const next = new Map(prev);
      const existing = next.get(index);
      if (existing) {
        next.set(index, {
          ...existing,
          materialForm: { ...existing.materialForm, [field]: value },
        });
      }
      return next;
    });
  }

  function updateConsumableForm(index: number, field: keyof ConsumableForm, value: string) {
    setDecisions((prev) => {
      const next = new Map(prev);
      const existing = next.get(index);
      if (existing) {
        next.set(index, {
          ...existing,
          consumableForm: { ...existing.consumableForm, [field]: value },
        });
      }
      return next;
    });
  }

  async function handleBulkCreate() {
    setCreating(true);
    setCreateError(null);
    const toCreate = Array.from(decisions.entries()).filter(([, d]) => d.action === "create");
    setCreateProgress({ current: 0, total: toCreate.length });

    const results = new Map<number, { id: string; type: "material" | "consumable" }>();
    let created = 0;

    for (const [index, decision] of toCreate) {
      setCreateProgress({ current: created + 1, total: toCreate.length });

      try {
        if (decision.category === "material") {
          const res = await fetch("/api/materials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: decision.materialForm.type,
              materialType: decision.materialForm.materialType,
              brand: decision.materialForm.brand || null,
              colour: decision.materialForm.colour || null,
              spoolWeightG: decision.materialForm.spoolWeightG,
              price: decision.materialForm.price,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            results.set(index, { id: data.id, type: "material" });
            created++;
          } else {
            const err = await res.json();
            setCreateError(`Failed to create material: ${err.error || "Unknown error"}`);
          }
        } else {
          const res = await fetch("/api/consumables", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: decision.consumableForm.name,
              category: decision.consumableForm.category,
              unitCost: decision.consumableForm.unitCost ? parseFloat(decision.consumableForm.unitCost) : null,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            results.set(index, { id: data.id, type: "consumable" });
            created++;
          } else {
            const err = await res.json();
            setCreateError(`Failed to create consumable: ${err.error || "Unknown error"}`);
          }
        }
      } catch {
        setCreateError("Network error during creation.");
      }
    }

    // Also record linked items
    for (const [index, decision] of decisions) {
      if (decision.action === "link") {
        if (decision.category === "material" && decision.linkedMaterialId) {
          results.set(index, { id: decision.linkedMaterialId, type: "material" });
        } else if (decision.category === "consumable" && decision.linkedConsumableId) {
          results.set(index, { id: decision.linkedConsumableId, type: "consumable" });
        }
      }
    }

    setCreatedIds(results);
    setCreatedCount(created);
    setCreating(false);
    setStep("done");
    onProductsCreated();
  }

  function handleCreatePO() {
    if (!parsed) return;

    // Build PO data with newly created/linked IDs
    const poData = {
      supplierName: parsed.supplierName,
      invoiceNumber: parsed.invoiceNumber,
      expectedDelivery: parsed.expectedDelivery,
      notes: parsed.notes,
      items: parsed.items.map((item, index) => {
        const created = createdIds.get(index);
        return {
          type: created?.type ?? (item.materialId ? "material" : item.consumableId ? "consumable" : "other"),
          materialId: item.materialId || (created?.type === "material" ? created.id : null),
          consumableId: item.consumableId || (created?.type === "consumable" ? created.id : null),
          description: item.description,
          quantity: item.quantity,
          unitCost: item.unitCost,
        };
      }),
    };

    sessionStorage.setItem("invoiceToPurchaseOrder", JSON.stringify(poData));
    onClose();
    router.push("/purchase-orders?fromInvoice=true");
  }

  // ------ Render ------

  return (
    <Dialog open={true} onClose={onClose} maxWidth="max-w-4xl">
      <DialogHeader onClose={onClose}>
        <DialogTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Import from Invoice
        </DialogTitle>
      </DialogHeader>

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a supplier invoice and AI will detect products. New products
            can be created before entering a purchase order.
          </p>

          {parsing ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Parsing {fileName}...
              </p>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/20 py-10 transition-colors hover:border-primary/50 hover:bg-muted/40">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Click to upload invoice
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PNG, JPEG, WebP, GIF, or PDF — max 20MB
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
          )}

          {parseError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{parseError}</span>
              <button
                type="button"
                onClick={() => { setParseError(null); setFileName(null); }}
                className="ml-auto text-xs underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step: Review */}
      {step === "review" && parsed && (
        <div className="space-y-4">
          {/* Invoice summary */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{fileName}</span>
            {parsed.supplierName && (
              <Badge variant="default">{parsed.supplierName}</Badge>
            )}
            {parsed.invoiceNumber && (
              <span className="text-muted-foreground">#{parsed.invoiceNumber}</span>
            )}
            <span className="text-muted-foreground">
              {parsed.items.length} item{parsed.items.length !== 1 ? "s" : ""} detected
            </span>
          </div>

          <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
            {/* Matched items */}
            {matchedItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Matched Products ({matchedItems.length})
                </h3>
                {matchedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30"
                  >
                    <Badge variant="success" size="sm">Matched</Badge>
                    <span className="flex-1 text-sm text-foreground">{item.description}</span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {item.quantity} &times; ${item.unitCost.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* New items */}
            {newItems.length > 0 && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <PackagePlus className="h-4 w-4 text-amber-500" />
                  New Products ({newItems.length})
                </h3>
                {newItems.map(({ item, index }) => {
                  const decision = decisions.get(index);
                  if (!decision) return null;
                  const similarMats = findSimilarMaterials(
                    item.suggestedName || item.description,
                    existingMaterials
                  );
                  const similarCons = findSimilarConsumables(
                    item.suggestedName || item.description,
                    consumables
                  );
                  const hasSimilar = similarMats.length > 0 || similarCons.length > 0;

                  return (
                    <div
                      key={index}
                      className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {item.suggestedName || item.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} &times; ${item.unitCost.toFixed(2)}
                          </p>
                        </div>
                        {/* Action toggle */}
                        <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
                          <button
                            onClick={() => updateDecision(index, { action: "create" })}
                            className={cn(
                              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                              decision.action === "create"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            Create new
                          </button>
                          <button
                            onClick={() => updateDecision(index, { action: "link" })}
                            className={cn(
                              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                              decision.action === "link"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            Link existing
                          </button>
                        </div>
                      </div>

                      {/* Create new form */}
                      {decision.action === "create" && (
                        <div className="space-y-3">
                          {/* Category toggle */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Create as:</span>
                            <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
                              <button
                                onClick={() => updateDecision(index, { category: "material" })}
                                className={cn(
                                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                                  decision.category === "material"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                Material
                              </button>
                              <button
                                onClick={() => updateDecision(index, { category: "consumable" })}
                                className={cn(
                                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                                  decision.category === "consumable"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                Consumable
                              </button>
                            </div>
                          </div>

                          {/* Material fields */}
                          {decision.category === "material" && (
                            <div className="grid gap-2 sm:grid-cols-3">
                              <Select
                                label="Type"
                                value={decision.materialForm.type}
                                onChange={(e) => updateMaterialForm(index, "type", e.target.value)}
                                options={[
                                  { value: "filament", label: "Filament" },
                                  { value: "resin", label: "Resin" },
                                ]}
                              />
                              <Select
                                label="Material"
                                value={decision.materialForm.materialType}
                                onChange={(e) => updateMaterialForm(index, "materialType", e.target.value)}
                                options={MATERIAL_TYPES.map((t) => ({ value: t, label: t }))}
                              />
                              <Input
                                label="Brand"
                                value={decision.materialForm.brand}
                                onChange={(e) => updateMaterialForm(index, "brand", e.target.value)}
                                placeholder="e.g. Bambu Lab"
                              />
                              <Input
                                label="Colour"
                                value={decision.materialForm.colour}
                                onChange={(e) => updateMaterialForm(index, "colour", e.target.value)}
                                placeholder="e.g. Black"
                              />
                              <Input
                                label="Spool weight (g)"
                                type="number"
                                value={decision.materialForm.spoolWeightG}
                                onChange={(e) => updateMaterialForm(index, "spoolWeightG", parseInt(e.target.value) || 1000)}
                              />
                              <Input
                                label="Price ($)"
                                type="number"
                                step="0.01"
                                value={decision.materialForm.price}
                                onChange={(e) => updateMaterialForm(index, "price", parseFloat(e.target.value) || 0)}
                              />
                            </div>
                          )}

                          {/* Consumable fields */}
                          {decision.category === "consumable" && (
                            <div className="grid gap-2 sm:grid-cols-3">
                              <Input
                                label="Name"
                                value={decision.consumableForm.name}
                                onChange={(e) => updateConsumableForm(index, "name", e.target.value)}
                              />
                              <Select
                                label="Category"
                                value={decision.consumableForm.category}
                                onChange={(e) => updateConsumableForm(index, "category", e.target.value)}
                                options={CONSUMABLE_CATEGORIES}
                              />
                              <Input
                                label="Unit cost ($)"
                                type="number"
                                step="0.01"
                                value={decision.consumableForm.unitCost}
                                onChange={(e) => updateConsumableForm(index, "unitCost", e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Link existing */}
                      {decision.action === "link" && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Link as:</span>
                            <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
                              <button
                                onClick={() => updateDecision(index, { category: "material" })}
                                className={cn(
                                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                                  decision.category === "material"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                Material
                              </button>
                              <button
                                onClick={() => updateDecision(index, { category: "consumable" })}
                                className={cn(
                                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                                  decision.category === "consumable"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                Consumable
                              </button>
                            </div>
                          </div>
                          {decision.category === "material" ? (
                            <Select
                              label="Select material"
                              value={decision.linkedMaterialId}
                              onChange={(e) => updateDecision(index, { linkedMaterialId: e.target.value })}
                              options={[
                                { value: "", label: "Select..." },
                                ...existingMaterials.map((m) => ({
                                  value: m.id,
                                  label: `${m.materialType}${m.brand ? ` — ${m.brand}` : ""}${m.colour ? `, ${m.colour}` : ""}`,
                                })),
                              ]}
                            />
                          ) : (
                            <Select
                              label="Select consumable"
                              value={decision.linkedConsumableId}
                              onChange={(e) => updateDecision(index, { linkedConsumableId: e.target.value })}
                              options={[
                                { value: "", label: "Select..." },
                                ...consumables.map((c) => ({
                                  value: c.id,
                                  label: c.name,
                                })),
                              ]}
                            />
                          )}
                        </div>
                      )}

                      {/* Duplicate detection */}
                      {decision.action === "create" && hasSimilar && (
                        <div className="rounded-md border border-amber-300 bg-amber-100/50 px-3 py-2 dark:border-amber-700 dark:bg-amber-900/20">
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                            Similar existing products:
                          </p>
                          <ul className="mt-1 space-y-0.5">
                            {similarMats.map((m) => (
                              <li key={m.id} className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                                <Link2 className="h-3 w-3" />
                                <span>
                                  {m.materialType}
                                  {m.brand ? ` — ${m.brand}` : ""}
                                  {m.colour ? `, ${m.colour}` : ""}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateDecision(index, {
                                    action: "link",
                                    category: "material",
                                    linkedMaterialId: m.id,
                                  })}
                                  className="ml-auto text-xs font-medium underline"
                                >
                                  Use this
                                </button>
                              </li>
                            ))}
                            {similarCons.map((c) => (
                              <li key={c.id} className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                                <Link2 className="h-3 w-3" />
                                <span>{c.name}</span>
                                <button
                                  type="button"
                                  onClick={() => updateDecision(index, {
                                    action: "link",
                                    category: "consumable",
                                    linkedConsumableId: c.id,
                                  })}
                                  className="ml-auto text-xs font-medium underline"
                                >
                                  Use this
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* All matched — no new items */}
            {newItems.length === 0 && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-950/30">
                <CheckCircle2 className="mx-auto h-6 w-6 text-green-500" />
                <p className="mt-2 text-sm font-medium text-foreground">
                  All products already exist in your inventory.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  You can proceed directly to creating a purchase order.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            {newItems.length > 0 ? (
              <Button onClick={handleBulkCreate}>
                <PackagePlus className="mr-2 h-4 w-4" />
                Create {newItems.filter(({ index }) => decisions.get(index)?.action === "create").length} Product{newItems.filter(({ index }) => decisions.get(index)?.action === "create").length !== 1 ? "s" : ""}
              </Button>
            ) : (
              <Button onClick={handleCreatePO}>
                <ArrowRight className="mr-2 h-4 w-4" />
                Create Purchase Order
              </Button>
            )}
          </DialogFooter>
        </div>
      )}

      {/* Step: Creating */}
      {step === "creating" && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Creating {createProgress.current} of {createProgress.total}...
          </p>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-sm font-medium text-foreground">
              {createdCount} product{createdCount !== 1 ? "s" : ""} created successfully
            </p>
          </div>

          {createError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
            <p className="text-sm font-medium text-foreground">
              Create a Purchase Order from this invoice?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The PO will be pre-filled with the supplier, items, and costs — no need to re-upload.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button variant="ghost" onClick={onClose}>
                No, done for now
              </Button>
              <Button onClick={handleCreatePO}>
                <ArrowRight className="mr-2 h-4 w-4" />
                Yes, create PO
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
