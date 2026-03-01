"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SkeletonListPage } from "@/components/ui/skeleton";
import { Plus, Minus, Pencil, Trash2, Package, Loader2, History, TrendingUp, TrendingDown, Upload } from "lucide-react";
import { MATERIAL_PRESETS } from "@/lib/presets";
import { InvoiceImportModal } from "./invoice-import-modal";

// ---------------------------------------------------------------------------
// Stock Transaction Types
// ---------------------------------------------------------------------------

interface StockTransaction {
  id: string;
  type: string;
  quantity: number;
  balanceAfter: number;
  notes: string | null;
  createdAt: string;
  user: { name: string | null } | null;
}

interface UsageStats {
  totalReceived: number;
  totalUsed: number;
  jobCount: number;
  avgPerJob: number;
  costOfGoods: number;
  transactionCount: number;
  months: { month: string; used: number }[];
}

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
  density: number | null;
  stockQty: number;
  lowStockThreshold: number;
  supplier: string | null;
  notes: string | null;
}

interface MaterialFormData {
  type: string;
  materialType: string;
  brand: string;
  colour: string;
  spoolWeightG: number;
  price: number;
  density: string;
  stockQty: number;
  lowStockThreshold: number;
  supplier: string;
  notes: string;
}

const EMPTY_FORM: MaterialFormData = {
  type: "filament",
  materialType: "PLA",
  brand: "",
  colour: "",
  spoolWeightG: 1000,
  price: 30,
  density: "",
  stockQty: 0,
  lowStockThreshold: 2,
  supplier: "",
  notes: "",
};

const MATERIAL_TYPES = [
  "PLA",
  "PETG",
  "ABS",
  "TPU",
  "ASA",
  "Nylon",
  "Resin",
  "Other",
] as const;

const FILTER_OPTIONS = ["All", ...MATERIAL_TYPES] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isHexColour(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);
}

function pricePerGram(price: number, weightG: number): string {
  if (weightG <= 0) return "N/A";
  return (price / weightG).toFixed(3);
}

function stockStatus(qty: number, threshold: number) {
  if (qty === 0) return { label: "Out of stock", variant: "destructive" as const };
  if (qty <= threshold) return { label: "Low stock", variant: "warning" as const };
  return { label: "In stock", variant: "success" as const };
}

// ---------------------------------------------------------------------------
// Material Form Modal
// ---------------------------------------------------------------------------

function MaterialFormModal({
  editingMaterial,
  formData,
  setFormData,
  onSave,
  onClose,
  saving,
}: {
  editingMaterial: Material | null;
  formData: MaterialFormData;
  setFormData: React.Dispatch<React.SetStateAction<MaterialFormData>>;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  const isEdit = editingMaterial !== null;

  return (
    <Dialog open={true} onClose={onClose} maxWidth="max-w-2xl">
      <DialogHeader onClose={onClose}>
        <DialogTitle>{isEdit ? "Edit Material" : "Add Material"}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Type"
          value={formData.type}
          onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
          options={[
            { value: "filament", label: "Filament" },
            { value: "resin", label: "Resin" },
          ]}
        />
        <Select
          label="Material type"
          value={formData.materialType}
          onChange={(e) => setFormData((prev) => ({ ...prev, materialType: e.target.value }))}
          options={MATERIAL_TYPES.map((t) => ({ value: t, label: t }))}
        />
        <Input
          label="Brand"
          value={formData.brand}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, brand: e.target.value }))
          }
          placeholder="e.g. eSun, Bambu Lab"
        />
        <Input
          label="Colour"
          value={formData.colour}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, colour: e.target.value }))
          }
          placeholder="e.g. Black, #FF5500"
        />
        <Input
          label="Spool weight (g)"
          type="number"
          step="1"
          min="1"
          value={formData.spoolWeightG}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              spoolWeightG: parseFloat(e.target.value) || 0,
            }))
          }
        />
        <Input
          label="Price (AUD)"
          type="number"
          step="0.01"
          min="0"
          value={formData.price}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              price: parseFloat(e.target.value) || 0,
            }))
          }
        />
        <Input
          label="Density (g/cm3)"
          type="number"
          step="0.01"
          min="0"
          value={formData.density}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, density: e.target.value }))
          }
          placeholder="Optional"
        />
        <Input
          label="Stock qty"
          type="number"
          step="1"
          min="0"
          value={formData.stockQty}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              stockQty: parseInt(e.target.value) || 0,
            }))
          }
        />
        <Input
          label="Low stock threshold"
          type="number"
          step="1"
          min="0"
          value={formData.lowStockThreshold}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              lowStockThreshold: parseInt(e.target.value) || 0,
            }))
          }
        />
        <Input
          label="Supplier"
          value={formData.supplier}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, supplier: e.target.value }))
          }
          placeholder="Optional"
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isEdit ? (
            "Save Changes"
          ) : (
            "Add Material"
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Mobile Card
// ---------------------------------------------------------------------------

function MaterialCard({
  material,
  onEdit,
  onDelete,
  onStockAdjust,
  onHistory,
  adjustingId,
}: {
  material: Material;
  onEdit: () => void;
  onDelete: () => void;
  onStockAdjust: (adjustment: number) => void;
  onHistory: () => void;
  adjustingId: string | null;
}) {
  const status = stockStatus(material.stockQty, material.lowStockThreshold);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{material.materialType}</span>
              {material.brand && (
                <span className="text-sm text-muted-foreground">
                  {material.brand}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="capitalize">{material.type}</span>
              {material.colour && (
                <span className="flex items-center gap-1">
                  {isHexColour(material.colour) ? (
                    <span
                      className="inline-block h-3 w-3 rounded-full border border-border"
                      style={{ backgroundColor: material.colour }}
                    />
                  ) : null}
                  {material.colour}
                </span>
              )}
            </div>
          </div>
          <Badge variant={status.variant}>
            {status.label}
          </Badge>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Price</span>
            <p className="font-medium">${material.price.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">$/g</span>
            <p className="font-medium">
              ${pricePerGram(material.price, material.spoolWeightG)}/g
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Stock</span>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={adjustingId === material.id || material.stockQty === 0}
                onClick={(e) => { e.stopPropagation(); onStockAdjust(-1); }}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="min-w-6 text-center font-medium tabular-nums">{material.stockQty}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={adjustingId === material.id}
                onClick={(e) => { e.stopPropagation(); onStockAdjust(1); }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-2 text-sm">
          <span className="text-muted-foreground">Stock value: </span>
          <span className="font-medium">${(material.price * material.stockQty).toFixed(2)}</span>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onHistory}>
            <History className="mr-1 h-3.5 w-3.5" />
            History
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Stock History Modal
// ---------------------------------------------------------------------------

function StockHistoryModal({
  material,
  onClose,
}: {
  material: Material;
  onClose: () => void;
}) {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/stock-transactions?materialId=${material.id}&limit=50`)
        .then((res) => (res.ok ? res.json() : [])),
      fetch(`/api/materials/${material.id}/usage`)
        .then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([txData, usageData]) => {
        setTransactions(txData);
        setUsage(usageData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [material.id]);

  const typeLabel: Record<string, string> = {
    received: "Received",
    used: "Used",
    adjusted: "Adjusted",
    auto_deduct: "Auto-deduct",
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="max-w-2xl">
      <DialogHeader onClose={onClose}>
        <DialogTitle>
          Stock History — {material.materialType}
          {material.brand ? ` (${material.brand})` : ""}
        </DialogTitle>
      </DialogHeader>
      {/* Usage stats */}
      {usage && usage.transactionCount > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
          <div className="rounded-lg border border-border p-2.5 text-center">
            <p className="text-lg font-bold tabular-nums text-emerald-500">+{usage.totalReceived}</p>
            <p className="text-[11px] text-muted-foreground">Received</p>
          </div>
          <div className="rounded-lg border border-border p-2.5 text-center">
            <p className="text-lg font-bold tabular-nums text-red-500">-{usage.totalUsed}</p>
            <p className="text-[11px] text-muted-foreground">Used</p>
          </div>
          <div className="rounded-lg border border-border p-2.5 text-center">
            <p className="text-lg font-bold tabular-nums">{usage.jobCount}</p>
            <p className="text-[11px] text-muted-foreground">Jobs</p>
          </div>
          <div className="rounded-lg border border-border p-2.5 text-center">
            <p className="text-lg font-bold tabular-nums">${usage.costOfGoods.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground">Cost of Goods</p>
          </div>
        </div>
      )}

      {/* Monthly usage mini-chart */}
      {usage && usage.months.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Monthly Usage (spools)</p>
          <div className="flex items-end gap-1 h-16">
            {usage.months.map((m) => {
              const max = Math.max(...usage.months.map((x) => x.used), 1);
              const heightPct = (m.used / max) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[10px] tabular-nums text-muted-foreground">{m.used}</span>
                  <div
                    className="w-full rounded-sm bg-primary/30"
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                  />
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(m.month + "-01").toLocaleDateString("en-AU", { month: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : transactions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No stock history yet.
        </p>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-left">
                <th className="px-3 py-2 font-medium text-muted-foreground">Date</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Type</th>
                <th className="px-3 py-2 font-medium text-muted-foreground text-right">Change</th>
                <th className="px-3 py-2 font-medium text-muted-foreground text-right">Balance</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 tabular-nums text-muted-foreground whitespace-nowrap">
                    {new Date(tx.createdAt).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={tx.quantity > 0 ? "success" : "destructive"}>
                      {typeLabel[tx.type] ?? tx.type}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <span className={cn(
                      "inline-flex items-center gap-1 font-medium",
                      tx.quantity > 0 ? "text-emerald-500" : "text-red-500"
                    )}>
                      {tx.quantity > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {tx.quantity > 0 ? "+" : ""}{tx.quantity}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {tx.balanceAfter}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground truncate max-w-40">
                    {tx.notes ?? "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </DialogFooter>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState<MaterialFormData>(EMPTY_FORM);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [historyMaterial, setHistoryMaterial] = useState<Material | null>(null);
  const [showInvoiceImport, setShowInvoiceImport] = useState(false);

  // Preset dropdown state
  const [presetOpen, setPresetOpen] = useState(false);
  const [presetLoading, setPresetLoading] = useState(false);
  const presetRef = useRef<HTMLDivElement>(null);

  // Close preset dropdown on outside click
  useEffect(() => {
    if (!presetOpen) return;
    function handleClick(e: MouseEvent) {
      if (presetRef.current && !presetRef.current.contains(e.target as Node)) {
        setPresetOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [presetOpen]);

  // ---- Fetch materials ----
  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/materials");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setMaterials(data);
    } catch (err) {
      console.error("Failed to fetch materials:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // ---- Filtered list ----
  const filtered =
    filter === "All"
      ? materials
      : materials.filter((m) => m.materialType === filter);

  // ---- Open form ----
  function openAddForm() {
    setEditingMaterial(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  }

  function openEditForm(material: Material) {
    setEditingMaterial(material);
    setFormData({
      type: material.type,
      materialType: material.materialType,
      brand: material.brand ?? "",
      colour: material.colour ?? "",
      spoolWeightG: material.spoolWeightG,
      price: material.price,
      density: material.density?.toString() ?? "",
      stockQty: material.stockQty,
      lowStockThreshold: material.lowStockThreshold,
      supplier: material.supplier ?? "",
      notes: material.notes ?? "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingMaterial(null);
  }

  // ---- Save (create or update) ----
  async function handleSave() {
    setSaving(true);

    const payload = {
      type: formData.type,
      materialType: formData.materialType,
      brand: formData.brand || null,
      colour: formData.colour || null,
      spoolWeightG: formData.spoolWeightG,
      price: formData.price,
      density: formData.density ? parseFloat(formData.density) : null,
      stockQty: formData.stockQty,
      lowStockThreshold: formData.lowStockThreshold,
      supplier: formData.supplier || null,
      notes: formData.notes || null,
    };

    try {
      const isEdit = editingMaterial !== null;
      const url = isEdit
        ? `/api/materials/${editingMaterial.id}`
        : "/api/materials";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("Save failed:", err);
        return;
      }

      closeForm();
      await fetchMaterials();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  }

  // ---- Add from preset ----
  async function handleAddFromPreset(presetIndex: number) {
    try {
      setPresetLoading(true);
      const res = await fetch("/api/materials/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetIndex }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error("Preset add failed:", err);
        return;
      }

      setPresetOpen(false);
      await fetchMaterials();
    } catch (err) {
      console.error("Preset add error:", err);
    } finally {
      setPresetLoading(false);
    }
  }

  // ---- Delete ----
  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this material?")) return;

    try {
      const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        console.error("Delete failed");
        return;
      }
      await fetchMaterials();
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  // ---- Stock adjustment ----
  async function handleStockAdjust(id: string, adjustment: number) {
    setAdjustingId(id);
    try {
      const res = await fetch(`/api/materials/${id}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjustment }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error("Stock adjust failed:", err);
        return;
      }
      const updated = await res.json();
      setMaterials((prev) =>
        prev.map((m) => (m.id === id ? { ...m, stockQty: updated.stockQty } : m))
      );
    } catch (err) {
      console.error("Stock adjust error:", err);
    } finally {
      setAdjustingId(null);
    }
  }

  // ---- Computed values ----
  const totalStockValue = materials.reduce(
    (sum, m) => sum + m.price * m.stockQty,
    0
  );

  // ---- Loading state ----
  if (loading) {
    return <SkeletonListPage />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="-mx-4 md:-mx-6 px-4 md:px-6 pb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={FILTER_OPTIONS.map((f) => ({ value: f, label: f }))}
            className="w-36"
          />
          <span className="text-sm text-muted-foreground">
            {filtered.length} material{filtered.length !== 1 ? "s" : ""}
          </span>
          {materials.length > 0 && (
            <span className="text-sm font-medium">
              Stock value: ${totalStockValue.toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <div className="relative" ref={presetRef}>
            <Button variant="secondary" onClick={() => setPresetOpen(!presetOpen)}>
              Add from Preset
            </Button>
            {presetOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-80 rounded-lg border border-border bg-card shadow-lg">
                <div className="max-h-80 overflow-y-auto p-1">
                  {MATERIAL_PRESETS.map((preset, index) => (
                    <button
                      key={index}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted transition-colors disabled:opacity-50"
                      onClick={() => handleAddFromPreset(index)}
                      disabled={presetLoading}
                    >
                      <span className="font-medium">
                        {preset.materialType} &mdash; {preset.brand} &mdash; {preset.colour}
                      </span>
                      <span className="ml-2 shrink-0 text-muted-foreground">${preset.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Button variant="secondary" onClick={() => setShowInvoiceImport(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import from Invoice
          </Button>
          <Button onClick={openAddForm}>
            <Plus className="mr-2 h-4 w-4" />
            Add Material
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16">
            <Package className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {materials.length === 0
                ? "No materials yet. Add your first material to get started."
                : "No materials match the current filter."}
            </p>
            {materials.length === 0 && (
              <Button variant="secondary" className="mt-2" onClick={openAddForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Material
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <div className="hidden md:block">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-2.5 font-medium text-muted-foreground">
                      Material
                    </th>
                    <th className="px-4 py-2.5 font-medium text-muted-foreground">
                      Brand
                    </th>
                    <th className="px-4 py-2.5 font-medium text-muted-foreground">
                      Colour
                    </th>
                    <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">
                      Spool (g)
                    </th>
                    <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">
                      Price
                    </th>
                    <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">
                      $/g
                    </th>
                    <th className="px-4 py-2.5 font-medium text-muted-foreground text-center">
                      Stock
                    </th>
                    <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">
                      Value
                    </th>
                    <th className="px-4 py-2.5 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((material) => {
                    const status = stockStatus(
                      material.stockQty,
                      material.lowStockThreshold
                    );

                    return (
                      <tr
                        key={material.id}
                        className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          <div className="font-medium">
                            {material.materialType}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {material.type}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {material.brand ?? "\u2014"}
                        </td>
                        <td className="px-4 py-2.5">
                          {material.colour ? (
                            <span className="flex items-center gap-1.5">
                              {isHexColour(material.colour) && (
                                <span
                                  className="inline-block h-3.5 w-3.5 rounded-full border border-border"
                                  style={{
                                    backgroundColor: material.colour,
                                  }}
                                />
                              )}
                              <span className="text-muted-foreground">
                                {material.colour}
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {"\u2014"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {material.spoolWeightG.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          ${material.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          $
                          {pricePerGram(
                            material.price,
                            material.spoolWeightG
                          )}
                          /g
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={adjustingId === material.id || material.stockQty === 0}
                              onClick={() => handleStockAdjust(material.id, -1)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-8 text-center font-medium tabular-nums">
                              {material.stockQty}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={adjustingId === material.id}
                              onClick={() => handleStockAdjust(material.id, 1)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          ${(material.price * material.stockQty).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setHistoryMaterial(material)}
                              title="Stock history"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditForm(material)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(material.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Mobile cards */}
      {filtered.length > 0 && (
        <div className="space-y-3 md:hidden">
          {filtered.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              onEdit={() => openEditForm(material)}
              onDelete={() => handleDelete(material.id)}
              onStockAdjust={(adj) => handleStockAdjust(material.id, adj)}
              onHistory={() => setHistoryMaterial(material)}
              adjustingId={adjustingId}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <MaterialFormModal
          editingMaterial={editingMaterial}
          formData={formData}
          setFormData={setFormData}
          onSave={handleSave}
          onClose={closeForm}
          saving={saving}
        />
      )}

      {/* Stock history modal */}
      {historyMaterial && (
        <StockHistoryModal
          material={historyMaterial}
          onClose={() => setHistoryMaterial(null)}
        />
      )}

      {/* Invoice import modal */}
      {showInvoiceImport && (
        <InvoiceImportModal
          onClose={() => setShowInvoiceImport(false)}
          onProductsCreated={fetchMaterials}
          existingMaterials={materials}
        />
      )}
    </div>
  );
}
