"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BANNER } from "@/lib/status-colours";
import { formatMoney } from "@/lib/currency";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Mail,
  Phone,
  Globe,
  Package,
} from "lucide-react";

// ---------- Types ----------

interface MaterialRef {
  materialType: string;
  brand: string | null;
  colour: string | null;
}

interface SupplierItem {
  id: string;
  supplierId: string;
  materialId: string | null;
  material: MaterialRef | null;
  partNumber: string | null;
  supplierSku: string | null;
  unitCost: number | null;
  url: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: SupplierItem[];
}

interface SupplierFormData {
  name: string;
  email: string;
  phone: string;
  website: string;
  notes: string;
}

interface ItemFormData {
  materialId: string;
  partNumber: string;
  supplierSku: string;
  unitCost: string;
  url: string;
  notes: string;
}

interface MaterialOption {
  id: string;
  materialType: string;
  brand: string | null;
  colour: string | null;
}

const emptySupplierForm: SupplierFormData = {
  name: "",
  email: "",
  phone: "",
  website: "",
  notes: "",
};

const emptyItemForm: ItemFormData = {
  materialId: "",
  partNumber: "",
  supplierSku: "",
  unitCost: "",
  url: "",
  notes: "",
};

// ---------- Helpers ----------

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function materialLabel(mat: MaterialRef): string {
  const parts = [mat.materialType];
  if (mat.brand) parts.push(mat.brand);
  if (mat.colour) parts.push(mat.colour);
  return parts.join(" — ");
}

function supplierToFormData(supplier: Supplier): SupplierFormData {
  return {
    name: supplier.name,
    email: supplier.email ?? "",
    phone: supplier.phone ?? "",
    website: supplier.website ?? "",
    notes: supplier.notes ?? "",
  };
}

function supplierFormToPayload(form: SupplierFormData) {
  return {
    name: form.name.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    website: form.website.trim() || null,
    notes: form.notes.trim() || null,
  };
}

function itemToFormData(item: SupplierItem): ItemFormData {
  return {
    materialId: item.materialId ?? "",
    partNumber: item.partNumber ?? "",
    supplierSku: item.supplierSku ?? "",
    unitCost: item.unitCost != null ? String(item.unitCost) : "",
    url: item.url ?? "",
    notes: item.notes ?? "",
  };
}

function itemFormToPayload(form: ItemFormData) {
  return {
    materialId: form.materialId.trim() || null,
    partNumber: form.partNumber.trim() || null,
    supplierSku: form.supplierSku.trim() || null,
    unitCost: form.unitCost.trim() ? parseFloat(form.unitCost) : null,
    url: form.url.trim() || null,
    notes: form.notes.trim() || null,
  };
}

// ---------- Component ----------

export function SupplierDetail() {
  const router = useRouter();
  const params = useParams();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit supplier modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [supplierSaving, setSupplierSaving] = useState(false);
  const [supplierForm, setSupplierForm] = useState<SupplierFormData>(emptySupplierForm);

  // Item modal
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormData>(emptyItemForm);
  const [itemSaving, setItemSaving] = useState(false);

  // Materials for dropdown
  const [materials, setMaterials] = useState<MaterialOption[]>([]);

  // Inline notes editing
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  // --- Fetch supplier ---

  const fetchSupplier = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/suppliers/${supplierId}`);
      if (!res.ok) throw new Error("Failed to fetch supplier");
      const data: Supplier = await res.json();
      setSupplier(data);
      setNotesValue(data.notes ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await fetch("/api/materials");
      if (!res.ok) return;
      const data = await res.json();
      setMaterials(
        data.map((m: MaterialOption) => ({
          id: m.id,
          materialType: m.materialType,
          brand: m.brand,
          colour: m.colour,
        }))
      );
    } catch {
      // Non-critical — materials dropdown just won't populate
    }
  }, []);

  useEffect(() => {
    fetchSupplier();
    fetchMaterials();
  }, [fetchSupplier, fetchMaterials]);

  // --- Supplier edit handlers ---

  function openEditSupplier() {
    if (!supplier) return;
    setSupplierForm(supplierToFormData(supplier));
    setEditModalOpen(true);
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setSupplierForm(emptySupplierForm);
  }

  async function handleSaveSupplier() {
    if (!supplierForm.name.trim()) {
      setError("Supplier name is required");
      return;
    }

    try {
      setSupplierSaving(true);
      setError(null);
      const payload = supplierFormToPayload(supplierForm);

      const res = await fetch(`/api/suppliers/${supplierId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to update supplier");
      }

      closeEditModal();
      await fetchSupplier();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSupplierSaving(false);
    }
  }

  async function handleDeleteSupplier() {
    if (!supplier) return;
    if (!confirm(`Delete "${supplier.name}"? This will also delete all supplied items. This cannot be undone.`)) return;

    try {
      setError(null);
      const res = await fetch(`/api/suppliers/${supplierId}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        throw new Error("Failed to delete supplier");
      }
      router.push("/suppliers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  // --- Notes handlers ---

  async function handleSaveNotes() {
    try {
      setNotesSaving(true);
      setError(null);
      const res = await fetch(`/api/suppliers/${supplierId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesValue.trim() || null }),
      });

      if (!res.ok) {
        throw new Error("Failed to save notes");
      }

      setEditingNotes(false);
      await fetchSupplier();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setNotesSaving(false);
    }
  }

  // --- Item handlers ---

  function openAddItem() {
    setEditingItemId(null);
    setItemForm(emptyItemForm);
    setItemModalOpen(true);
  }

  function openEditItem(item: SupplierItem) {
    setEditingItemId(item.id);
    setItemForm(itemToFormData(item));
    setItemModalOpen(true);
  }

  function closeItemModal() {
    setItemModalOpen(false);
    setEditingItemId(null);
    setItemForm(emptyItemForm);
  }

  async function handleSaveItem() {
    try {
      setItemSaving(true);
      setError(null);
      const payload = itemFormToPayload(itemForm);

      const url = editingItemId
        ? `/api/suppliers/${supplierId}/items/${editingItemId}`
        : `/api/suppliers/${supplierId}/items`;
      const method = editingItemId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error || `Failed to ${editingItemId ? "update" : "create"} item`
        );
      }

      closeItemModal();
      await fetchSupplier();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setItemSaving(false);
    }
  }

  async function handleDeleteItem(item: SupplierItem) {
    if (!confirm("Delete this supplier item? This cannot be undone.")) return;

    try {
      setError(null);
      const res = await fetch(
        `/api/suppliers/${supplierId}/items/${item.id}`,
        { method: "DELETE" }
      );
      if (!res.ok && res.status !== 204) {
        throw new Error("Failed to delete item");
      }
      await fetchSupplier();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  // --- Loading / Not found ---

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Loading supplier...</p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Supplier not found.</p>
        <Button variant="secondary" onClick={() => router.push("/suppliers")}>
          Back to Suppliers
        </Button>
      </div>
    );
  }

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/suppliers")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Suppliers
      </Button>

      {/* Error banner */}
      {error && (
        <div className={BANNER.error}>
          {error}
        </div>
      )}

      {/* Supplier header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl">{supplier.name}</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={openEditSupplier}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="ghost"
                className="text-destructive-foreground hover:bg-destructive/10"
                onClick={handleDeleteSupplier}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">
                {supplier.email ? (
                  <a
                    href={`mailto:${supplier.email}`}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {supplier.email}
                  </a>
                ) : (
                  <span className="text-muted-foreground">&mdash;</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium">
                {supplier.phone ? (
                  <a
                    href={`tel:${supplier.phone}`}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {supplier.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">&mdash;</span>
                )}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Website</p>
              <p className="font-medium">
                {supplier.website ? (
                  <a
                    href={supplier.website.startsWith("http") ? supplier.website : `https://${supplier.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {supplier.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">&mdash;</span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            Supplier since {formatDate(supplier.createdAt)}
          </div>
        </CardContent>
      </Card>

      {/* Supplied Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Supplied Items</CardTitle>
            <Button size="sm" onClick={openAddItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {supplier.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <Package className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No items yet.</p>
              <Button variant="secondary" size="sm" onClick={openAddItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Item
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
                        Part Number
                      </th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">
                        SKU
                      </th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">
                        Material
                      </th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                        Unit Cost
                      </th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">
                        URL
                      </th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplier.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-3 py-2 font-medium">
                          {item.partNumber || (
                            <span className="text-muted-foreground">&mdash;</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {item.supplierSku || (
                            <span className="text-muted-foreground">&mdash;</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {item.material ? (
                            <Badge variant="outline">
                              {materialLabel(item.material)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">&mdash;</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">
                          {item.unitCost != null
                            ? formatMoney(item.unitCost)
                            : <span className="text-muted-foreground">&mdash;</span>}
                        </td>
                        <td className="px-3 py-2">
                          {item.url ? (
                            <a
                              href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              Link
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">&mdash;</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditItem(item)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
                {supplier.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {item.partNumber || item.supplierSku || "Untitled Item"}
                        </p>
                        {item.material && (
                          <Badge variant="outline" className="mt-1">
                            {materialLabel(item.material)}
                          </Badge>
                        )}
                      </div>
                      <div className="ml-2 flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditItem(item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.supplierSku ? `SKU: ${item.supplierSku}` : ""}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {item.unitCost != null
                          ? formatMoney(item.unitCost)
                          : ""}
                      </span>
                    </div>
                    {item.url && (
                      <a
                        href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        View Link
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notes section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Notes</CardTitle>
            {!editingNotes && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNotesValue(supplier.notes ?? "");
                  setEditingNotes(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingNotes ? (
            <div className="space-y-3">
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Add notes about this supplier..."
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingNotes(false);
                    setNotesValue(supplier.notes ?? "");
                  }}
                  disabled={notesSaving}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={notesSaving}
                >
                  {notesSaving ? "Saving..." : "Save Notes"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {supplier.notes || "No notes yet."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit supplier modal */}
      {editModalOpen && (
        <Dialog open={true} onClose={closeEditModal}>
          <DialogHeader onClose={closeEditModal}>
            <DialogTitle>Edit Supplier</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              label="Name *"
              value={supplierForm.name}
              onChange={(e) =>
                setSupplierForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. eSun Australia"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                value={supplierForm.email}
                onChange={(e) =>
                  setSupplierForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="sales@supplier.com"
              />
              <Input
                label="Phone"
                value={supplierForm.phone}
                onChange={(e) =>
                  setSupplierForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="1300 123 456"
              />
            </div>

            <Input
              label="Website"
              value={supplierForm.website}
              onChange={(e) =>
                setSupplierForm((prev) => ({ ...prev, website: e.target.value }))
              }
              placeholder="https://www.supplier.com.au"
            />

            <Textarea
              label="Notes"
              value={supplierForm.notes}
              onChange={(e) =>
                setSupplierForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Any notes about this supplier..."
            />

            <DialogFooter>
              <Button variant="secondary" onClick={closeEditModal} disabled={supplierSaving}>
                Cancel
              </Button>
              <Button onClick={handleSaveSupplier} disabled={supplierSaving}>
                {supplierSaving ? "Saving..." : "Save Supplier"}
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* Add/Edit item modal */}
      {itemModalOpen && (
        <Dialog open={true} onClose={closeItemModal}>
          <DialogHeader onClose={closeItemModal}>
            <DialogTitle>
              {editingItemId ? "Edit Item" : "Add Item"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Material dropdown */}
            <Select
              label="Material"
              value={itemForm.materialId}
              onChange={(e) =>
                setItemForm((prev) => ({ ...prev, materialId: e.target.value }))
              }
              options={[
                { value: "", label: "None (unlinked)" },
                ...materials.map((m) => ({
                  value: m.id,
                  label: [m.materialType, m.brand, m.colour]
                    .filter(Boolean)
                    .join(" — "),
                })),
              ]}
            />

            {/* Part Number & SKU */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Part Number"
                value={itemForm.partNumber}
                onChange={(e) =>
                  setItemForm((prev) => ({ ...prev, partNumber: e.target.value }))
                }
                placeholder="e.g. PLA-BLK-1KG"
              />
              <Input
                label="Supplier SKU"
                value={itemForm.supplierSku}
                onChange={(e) =>
                  setItemForm((prev) => ({ ...prev, supplierSku: e.target.value }))
                }
                placeholder="e.g. ESUN-001"
              />
            </div>

            {/* Unit Cost */}
            <Input
              label="Unit Cost ($)"
              type="number"
              min="0"
              step="0.01"
              value={itemForm.unitCost}
              onChange={(e) =>
                setItemForm((prev) => ({ ...prev, unitCost: e.target.value }))
              }
              placeholder="e.g. 29.95"
            />

            {/* URL */}
            <Input
              label="Product URL"
              value={itemForm.url}
              onChange={(e) =>
                setItemForm((prev) => ({ ...prev, url: e.target.value }))
              }
              placeholder="https://www.supplier.com.au/product"
            />

            {/* Notes */}
            <Textarea
              label="Notes"
              value={itemForm.notes}
              onChange={(e) =>
                setItemForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Any notes about this item..."
            />

            <DialogFooter>
              <Button variant="secondary" onClick={closeItemModal} disabled={itemSaving}>
                Cancel
              </Button>
              <Button onClick={handleSaveItem} disabled={itemSaving}>
                {itemSaving ? "Saving..." : editingItemId ? "Save Item" : "Add Item"}
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}
    </div>
  );
}
