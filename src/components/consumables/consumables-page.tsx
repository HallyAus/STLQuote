"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Wrench, Search } from "lucide-react";
import { BANNER } from "@/lib/status-colours";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Supplier {
  id: string;
  name: string;
}

interface Printer {
  id: string;
  name: string;
  model: string | null;
}

interface Consumable {
  id: string;
  name: string;
  category: string;
  stockQty: number;
  lowStockThreshold: number;
  unitCost: number | null;
  supplierId: string | null;
  supplier: Supplier | null;
  printerId: string | null;
  printer: Printer | null;
  notes: string | null;
}

interface ConsumableFormData {
  name: string;
  category: string;
  stockQty: number;
  lowStockThreshold: number;
  unitCost: string;
  supplierId: string;
  printerId: string;
  notes: string;
}

const EMPTY_FORM: ConsumableFormData = {
  name: "",
  category: "other",
  stockQty: 0,
  lowStockThreshold: 1,
  unitCost: "",
  supplierId: "",
  printerId: "",
  notes: "",
};

const CATEGORIES = [
  { value: "nozzle", label: "Nozzle" },
  { value: "build_plate", label: "Build Plate" },
  { value: "belt", label: "Belt" },
  { value: "lubricant", label: "Lubricant" },
  { value: "other", label: "Other" },
] as const;

const FILTER_OPTIONS = [
  { value: "All", label: "All" },
  ...CATEGORIES,
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function categoryLabel(category: string): string {
  const found = CATEGORIES.find((c) => c.value === category);
  return found ? found.label : category;
}

function stockStatus(qty: number, threshold: number) {
  if (qty === 0)
    return { label: "Out", variant: "destructive" as const };
  if (qty <= threshold)
    return { label: "Low", variant: "warning" as const };
  return { label: "OK", variant: "success" as const };
}

// ---------------------------------------------------------------------------
// Consumable Form Modal
// ---------------------------------------------------------------------------

function ConsumableFormModal({
  editingConsumable,
  formData,
  setFormData,
  onSave,
  onClose,
  saving,
  suppliers,
  printers,
}: {
  editingConsumable: Consumable | null;
  formData: ConsumableFormData;
  setFormData: React.Dispatch<React.SetStateAction<ConsumableFormData>>;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  suppliers: Supplier[];
  printers: Printer[];
}) {
  const isEdit = editingConsumable !== null;

  return (
    <Dialog open={true} onClose={onClose} maxWidth="max-w-2xl">
      <DialogHeader onClose={onClose}>
        <DialogTitle>
          {isEdit ? "Edit Consumable" : "Add Consumable"}
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="e.g. 0.4mm Hardened Steel Nozzle"
        />
        <Select
          label="Category"
          value={formData.category}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, category: e.target.value }))
          }
          options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
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
          label="Unit cost (AUD)"
          type="number"
          step="0.01"
          min="0"
          value={formData.unitCost}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, unitCost: e.target.value }))
          }
          placeholder="Optional"
        />
        <Select
          label="Supplier"
          value={formData.supplierId}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, supplierId: e.target.value }))
          }
          options={[
            { value: "", label: "None" },
            ...suppliers.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
        <Select
          label="Printer"
          value={formData.printerId}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, printerId: e.target.value }))
          }
          options={[
            { value: "", label: "None" },
            ...printers.map((p) => ({
              value: p.id,
              label: p.model ? `${p.name} (${p.model})` : p.name,
            })),
          ]}
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={saving || !formData.name.trim()}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isEdit ? (
            "Save Changes"
          ) : (
            "Add Consumable"
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Mobile Card
// ---------------------------------------------------------------------------

function ConsumableCard({
  consumable,
  onEdit,
  onDelete,
  confirmDeleteId,
}: {
  consumable: Consumable;
  onEdit: () => void;
  onDelete: () => void;
  confirmDeleteId: string | null;
}) {
  const status = stockStatus(consumable.stockQty, consumable.lowStockThreshold);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{consumable.name}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="default">{categoryLabel(consumable.category)}</Badge>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Stock</span>
            <p className="font-medium tabular-nums">{consumable.stockQty}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Threshold</span>
            <p className="font-medium tabular-nums">
              {consumable.lowStockThreshold}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Unit cost</span>
            <p className="font-medium tabular-nums">
              {consumable.unitCost != null
                ? `$${consumable.unitCost.toFixed(2)}`
                : "\u2014"}
            </p>
          </div>
        </div>
        {(consumable.supplier || consumable.printer) && (
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            {consumable.supplier && (
              <div>
                <span className="text-muted-foreground">Supplier</span>
                <p className="truncate">{consumable.supplier.name}</p>
              </div>
            )}
            {consumable.printer && (
              <div>
                <span className="text-muted-foreground">Printer</span>
                <p className="truncate">{consumable.printer.name}</p>
              </div>
            )}
          </div>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className={cn(
              confirmDeleteId === consumable.id &&
                "text-destructive-foreground bg-destructive/15"
            )}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            {confirmDeleteId === consumable.id ? "Confirm?" : "Delete"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ConsumablesPage() {
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingConsumable, setEditingConsumable] =
    useState<Consumable | null>(null);
  const [formData, setFormData] = useState<ConsumableFormData>(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ---- Fetch consumables ----
  const fetchConsumables = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/consumables");
      if (!res.ok) throw new Error("Failed to fetch consumables");
      const data = await res.json();
      setConsumables(data);
    } catch (err) {
      console.error("Failed to fetch consumables:", err);
      setError("Failed to load consumables. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- Fetch suppliers and printers for dropdowns ----
  const fetchRelations = useCallback(async () => {
    try {
      const [suppliersRes, printersRes] = await Promise.all([
        fetch("/api/suppliers"),
        fetch("/api/printers"),
      ]);
      if (suppliersRes.ok) {
        const data = await suppliersRes.json();
        setSuppliers(data);
      }
      if (printersRes.ok) {
        const data = await printersRes.json();
        setPrinters(data);
      }
    } catch (err) {
      console.error("Failed to fetch relations:", err);
    }
  }, []);

  useEffect(() => {
    fetchConsumables();
    fetchRelations();
  }, [fetchConsumables, fetchRelations]);

  // ---- Clear delete confirmation on outside interaction ----
  useEffect(() => {
    if (!confirmDeleteId) return;
    const timer = setTimeout(() => setConfirmDeleteId(null), 3000);
    return () => clearTimeout(timer);
  }, [confirmDeleteId]);

  // ---- Filtered + searched list ----
  const filtered = consumables.filter((c) => {
    const matchesFilter =
      filter === "All" || c.category === filter;
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // ---- Open form ----
  function openAddForm() {
    setEditingConsumable(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  }

  function openEditForm(consumable: Consumable) {
    setEditingConsumable(consumable);
    setFormData({
      name: consumable.name,
      category: consumable.category,
      stockQty: consumable.stockQty,
      lowStockThreshold: consumable.lowStockThreshold,
      unitCost:
        consumable.unitCost != null ? consumable.unitCost.toString() : "",
      supplierId: consumable.supplierId ?? "",
      printerId: consumable.printerId ?? "",
      notes: consumable.notes ?? "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingConsumable(null);
  }

  // ---- Save (create or update) ----
  async function handleSave() {
    setSaving(true);

    const payload = {
      name: formData.name,
      category: formData.category,
      stockQty: formData.stockQty,
      lowStockThreshold: formData.lowStockThreshold,
      unitCost: formData.unitCost ? parseFloat(formData.unitCost) : null,
      supplierId: formData.supplierId || null,
      printerId: formData.printerId || null,
      notes: formData.notes || null,
    };

    try {
      const isEdit = editingConsumable !== null;
      const url = isEdit
        ? `/api/consumables/${editingConsumable.id}`
        : "/api/consumables";
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
      await fetchConsumables();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  }

  // ---- Delete (double-click confirmation) ----
  async function handleDelete(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }

    // Second click — perform delete
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/consumables/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        console.error("Delete failed");
        return;
      }
      await fetchConsumables();
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
      {/* Error banner */}
      {error && <div className={BANNER.error}>{error}</div>}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={FILTER_OPTIONS.map((f) => ({
              value: f.value,
              label: f.label,
            }))}
            className="w-36"
          />
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-48 pl-8"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Button onClick={openAddForm}>
          <Plus className="mr-2 h-4 w-4" />
          Add Consumable
        </Button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16">
            <Wrench className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {consumables.length === 0
                ? "No consumables yet. Add your first consumable to get started."
                : "No consumables match the current filter."}
            </p>
            {consumables.length === 0 && (
              <Button
                variant="secondary"
                className="mt-2"
                onClick={openAddForm}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Consumable
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
                      Name
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      Category
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-center">
                      Stock
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-center">
                      Threshold
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                      Unit Cost
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      Supplier
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      Printer
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
                  {filtered.map((consumable) => {
                    const status = stockStatus(
                      consumable.stockQty,
                      consumable.lowStockThreshold
                    );

                    return (
                      <tr
                        key={consumable.id}
                        className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium">
                          {consumable.name}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="default">
                            {categoryLabel(consumable.category)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums">
                          {consumable.stockQty}
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums">
                          {consumable.lowStockThreshold}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {consumable.unitCost != null
                            ? `$${consumable.unitCost.toFixed(2)}`
                            : "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {consumable.supplier?.name ?? "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {consumable.printer?.name ?? "\u2014"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditForm(consumable)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(consumable.id)}
                              title={
                                confirmDeleteId === consumable.id
                                  ? "Click again to confirm"
                                  : "Delete"
                              }
                              className={cn(
                                confirmDeleteId === consumable.id &&
                                  "text-destructive-foreground bg-destructive/15"
                              )}
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
          {filtered.map((consumable) => (
            <ConsumableCard
              key={consumable.id}
              consumable={consumable}
              onEdit={() => openEditForm(consumable)}
              onDelete={() => handleDelete(consumable.id)}
              confirmDeleteId={confirmDeleteId}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <ConsumableFormModal
          editingConsumable={editingConsumable}
          formData={formData}
          setFormData={setFormData}
          onSave={handleSave}
          onClose={closeForm}
          saving={saving}
          suppliers={suppliers}
          printers={printers}
        />
      )}
    </div>
  );
}
