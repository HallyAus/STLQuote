"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, Package, Loader2 } from "lucide-react";

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
  if (qty === 0) return { label: "Out of stock", className: "bg-red-500/15 text-red-500" };
  if (qty <= threshold) return { label: "Low stock", className: "bg-orange-500/15 text-orange-500" };
  return { label: "In stock", className: "bg-green-500/15 text-green-500" };
}

// ---------------------------------------------------------------------------
// Select component (styled to match Input)
// ---------------------------------------------------------------------------

function Select({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const id = label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Textarea component (styled to match Input)
// ---------------------------------------------------------------------------

function Textarea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  const id = label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <textarea
        id={id}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />
    </div>
  );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>{isEdit ? "Edit Material" : "Add Material"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Type"
              value={formData.type}
              onChange={(v) => setFormData((prev) => ({ ...prev, type: v }))}
              options={[
                { value: "filament", label: "Filament" },
                { value: "resin", label: "Resin" },
              ]}
            />
            <Select
              label="Material type"
              value={formData.materialType}
              onChange={(v) => setFormData((prev) => ({ ...prev, materialType: v }))}
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
                onChange={(v) => setFormData((prev) => ({ ...prev, notes: v }))}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile Card
// ---------------------------------------------------------------------------

function MaterialCard({
  material,
  onEdit,
  onDelete,
}: {
  material: Material;
  onEdit: () => void;
  onDelete: () => void;
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
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
              status.className
            )}
          >
            {status.label}
          </span>
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
            <p className="font-medium">{material.stockQty}</p>
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
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

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Select
            value={filter}
            onChange={setFilter}
            options={FILTER_OPTIONS.map((f) => ({ value: f, label: f }))}
            className="w-36"
          />
          <span className="text-sm text-muted-foreground">
            {filtered.length} material{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Button onClick={openAddForm}>
          <Plus className="mr-2 h-4 w-4" />
          Add Material
        </Button>
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
                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      Material
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      Brand
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      Colour
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                      Spool (g)
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                      Price
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                      $/g
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                      Stock
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">
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
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {material.materialType}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {material.type}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {material.brand ?? "\u2014"}
                        </td>
                        <td className="px-4 py-3">
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
                        <td className="px-4 py-3 text-right tabular-nums">
                          {material.spoolWeightG.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          ${material.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          $
                          {pricePerGram(
                            material.price,
                            material.spoolWeightG
                          )}
                          /g
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {material.stockQty}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              status.className
                            )}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
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
    </div>
  );
}
