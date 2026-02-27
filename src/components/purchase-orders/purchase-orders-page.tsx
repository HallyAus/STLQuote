"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Loader2,
  ShoppingCart,

  X,
  UserPlus,
  Upload,
  FileText,
  Sparkles,
  AlertCircle,
  PackagePlus,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Supplier {
  id: string;
  name: string;
}

interface Material {
  id: string;
  materialType: string;
  brand: string | null;
}

interface Consumable {
  id: string;
  name: string;
}

interface POItem {
  id: string;
  description: string;
  quantity: number;
  unitCost: number;
  receivedQty: number;
  material: { materialType: string; brand: string | null } | null;
  consumable: { name: string } | null;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  expectedDelivery: string | null;
  totalCost: number;
  notes: string | null;
  createdAt: string;
  supplier: { name: string };
  items: POItem[];
}

interface NewItemForm {
  type: "material" | "consumable" | "other";
  materialId: string;
  consumableId: string;
  description: string;
  quantity: number;
  unitCost: number;
}

const EMPTY_ITEM: NewItemForm = {
  type: "other",
  materialId: "",
  consumableId: "",
  description: "",
  quantity: 1,
  unitCost: 0,
};

const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "ORDERED", label: "Ordered" },
  { value: "RECEIVED", label: "Received" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_VARIANTS: Record<string, "default" | "success" | "warning" | "destructive"> = {
  DRAFT: "default",
  ORDERED: "warning",
  RECEIVED: "success",
  CANCELLED: "destructive",
};

// ---------------------------------------------------------------------------
// Create PO Modal
// ---------------------------------------------------------------------------

interface ParsedInvoiceItem {
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

function CreatePOModal({
  onClose,
  onCreated,
  suppliers,
  materials,
  consumables,
  onSuppliersChanged,
}: {
  onClose: () => void;
  onCreated: () => void;
  suppliers: Supplier[];
  materials: Material[];
  consumables: Consumable[];
  onSuppliersChanged: (suppliers: Supplier[]) => void;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<NewItemForm[]>([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // AI invoice upload
  const [invoiceParsing, setInvoiceParsing] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceFileName, setInvoiceFileName] = useState<string | null>(null);
  const [newItemFlags, setNewItemFlags] = useState<Map<number, ParsedInvoiceItem>>(new Map());

  // Inline supplier creation
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [creatingSupplier, setCreatingSupplier] = useState(false);

  async function handleQuickCreateSupplier() {
    if (!newSupplierName.trim()) return;
    setCreatingSupplier(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSupplierName.trim(),
          email: newSupplierEmail.trim() || null,
          phone: newSupplierPhone.trim() || null,
        }),
      });
      if (!res.ok) return;
      const created = await res.json();
      onSuppliersChanged([...suppliers, { id: created.id, name: created.name }]);
      setSupplierId(created.id);
      setShowNewSupplier(false);
      setNewSupplierName("");
      setNewSupplierEmail("");
      setNewSupplierPhone("");
    } catch {
      // ignore
    } finally {
      setCreatingSupplier(false);
    }
  }

  async function handleInvoiceUpload(file: File) {
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setInvoiceError("Unsupported file type. Use PNG, JPEG, WebP, GIF, or PDF.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setInvoiceError("File too large. Maximum 20MB.");
      return;
    }

    setInvoiceParsing(true);
    setInvoiceError(null);
    setInvoiceFileName(file.name);

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
        setInvoiceError(err.error || "Failed to parse invoice.");
        return;
      }

      const data = await res.json();

      // Auto-match supplier by name
      if (data.supplierName) {
        const match = suppliers.find(
          (s) => s.name.toLowerCase().includes(data.supplierName.toLowerCase()) ||
                 data.supplierName.toLowerCase().includes(s.name.toLowerCase())
        );
        if (match) {
          setSupplierId(match.id);
        } else {
          // Pre-fill inline supplier creation
          setShowNewSupplier(true);
          setNewSupplierName(data.supplierName);
        }
      }

      // Auto-fill expected delivery
      if (data.expectedDelivery) {
        setExpectedDelivery(data.expectedDelivery.slice(0, 10));
      }

      // Auto-fill notes
      if (data.notes) {
        setNotes((prev) => prev ? `${prev}\n${data.notes}` : data.notes);
      }

      // Auto-fill items
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        const newFlags = new Map<number, ParsedInvoiceItem>();
        const parsed: NewItemForm[] = data.items.map((item: ParsedInvoiceItem, idx: number) => {
          if (item.isNew) {
            newFlags.set(idx, item);
          }
          return {
            type: item.type === "material" || item.type === "consumable" ? item.type : "other",
            materialId: item.materialId || "",
            consumableId: item.consumableId || "",
            description: item.description || "",
            quantity: item.quantity || 1,
            unitCost: item.unitCost || 0,
          };
        });
        setItems(parsed);
        setNewItemFlags(newFlags);
      }
    } catch {
      setInvoiceError("Failed to upload invoice. Check your connection.");
    } finally {
      setInvoiceParsing(false);
    }
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof NewItemForm, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        // Auto-fill description when selecting material/consumable
        if (field === "materialId" && typeof value === "string" && value) {
          const mat = materials.find((m) => m.id === value);
          if (mat) updated.description = `${mat.materialType}${mat.brand ? ` — ${mat.brand}` : ""}`;
        }
        if (field === "consumableId" && typeof value === "string" && value) {
          const con = consumables.find((c) => c.id === value);
          if (con) updated.description = con.name;
        }
        if (field === "type") {
          updated.materialId = "";
          updated.consumableId = "";
        }
        return updated;
      })
    );
  }

  async function handleCreate() {
    setApiError(null);

    if (!supplierId) {
      setApiError("Please select a supplier.");
      return;
    }
    if (items.length === 0) {
      setApiError("Add at least one item.");
      return;
    }
    const emptyDesc = items.findIndex((i) => !i.description.trim());
    if (emptyDesc !== -1) {
      setApiError(`Item ${emptyDesc + 1} needs a description.`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        supplierId,
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery).toISOString() : null,
        notes: notes || null,
        items: items.map((item) => ({
          materialId: item.materialId || null,
          consumableId: item.consumableId || null,
          description: item.description,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
      };

      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        setApiError(err.error || "Failed to create purchase order.");
        return;
      }

      onCreated();
      onClose();
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const totalCost = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);

  return (
    <Dialog open={true} onClose={onClose} maxWidth="max-w-3xl">
      <DialogHeader onClose={onClose}>
        <DialogTitle>New Purchase Order</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {/* AI Invoice Upload */}
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-primary/10 p-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground">
                Scan Invoice with AI
              </h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Upload a supplier invoice and AI will extract the items, quantities, and costs automatically.
              </p>

              {invoiceParsing ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Parsing {invoiceFileName}...</span>
                </div>
              ) : invoiceFileName && !invoiceError ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <FileText className="h-4 w-4" />
                  <span>Parsed from {invoiceFileName} — review items below</span>
                </div>
              ) : (
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                  <Upload className="h-3.5 w-3.5" />
                  Upload Invoice
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleInvoiceUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}

              {invoiceError && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{invoiceError}</span>
                  <button
                    type="button"
                    onClick={() => { setInvoiceError(null); setInvoiceFileName(null); }}
                    className="ml-2 text-xs underline"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Select
              label="Supplier"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              options={[
                { value: "", label: "Select supplier..." },
                ...suppliers.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
            {!showNewSupplier ? (
              <button
                type="button"
                onClick={() => setShowNewSupplier(true)}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <UserPlus className="h-3 w-3" />
                Create new supplier
              </button>
            ) : (
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">New Supplier</span>
                  <button
                    type="button"
                    onClick={() => { setShowNewSupplier(false); setNewSupplierName(""); setNewSupplierEmail(""); setNewSupplierPhone(""); }}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Input
                  label="Name *"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="Supplier name"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Email"
                    type="email"
                    value={newSupplierEmail}
                    onChange={(e) => setNewSupplierEmail(e.target.value)}
                    placeholder="Optional"
                  />
                  <Input
                    label="Phone"
                    value={newSupplierPhone}
                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleQuickCreateSupplier}
                  disabled={creatingSupplier || !newSupplierName.trim()}
                >
                  {creatingSupplier ? (
                    <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Creating...</>
                  ) : (
                    "Create Supplier"
                  )}
                </Button>
              </div>
            )}
          </div>
          <Input
            label="Expected delivery"
            type="date"
            value={expectedDelivery}
            onChange={(e) => setExpectedDelivery(e.target.value)}
          />
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Items</h3>
            <Button variant="ghost" size="sm" onClick={addItem}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Item
            </Button>
          </div>
          <div className="space-y-3">
            {items.map((item, index) => {
              const newFlag = newItemFlags.get(index);
              return (
                <div key={index} className="space-y-1">
                  <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-12">
                    <div className="sm:col-span-2">
                      <Select
                        label="Type"
                        value={item.type}
                        onChange={(e) => updateItem(index, "type", e.target.value)}
                        options={[
                          { value: "material", label: "Material" },
                          { value: "consumable", label: "Consumable" },
                          { value: "other", label: "Other" },
                        ]}
                      />
                    </div>
                    {item.type === "material" && (
                      <div className="sm:col-span-3">
                        <Select
                          label="Material"
                          value={item.materialId}
                          onChange={(e) => updateItem(index, "materialId", e.target.value)}
                          options={[
                            { value: "", label: "Select..." },
                            ...materials.map((m) => ({
                              value: m.id,
                              label: `${m.materialType}${m.brand ? ` — ${m.brand}` : ""}`,
                            })),
                          ]}
                        />
                      </div>
                    )}
                    {item.type === "consumable" && (
                      <div className="sm:col-span-3">
                        <Select
                          label="Consumable"
                          value={item.consumableId}
                          onChange={(e) => updateItem(index, "consumableId", e.target.value)}
                          options={[
                            { value: "", label: "Select..." },
                            ...consumables.map((c) => ({
                              value: c.id,
                              label: c.name,
                            })),
                          ]}
                        />
                      </div>
                    )}
                    <div className={item.type === "other" ? "sm:col-span-5" : "sm:col-span-3"}>
                      <Input
                        label="Description"
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        label="Qty"
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        label="Unit cost"
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitCost}
                        onChange={(e) => updateItem(index, "unitCost", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="flex items-end sm:col-span-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {newFlag && (
                    <div className="flex items-center gap-2 px-3">
                      <PackagePlus className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        New product — add as{" "}
                        <span className="font-medium">{newFlag.suggestedCategory || "consumable"}</span>
                        {" "}in Inventory after creating this PO
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-right text-sm font-medium">
            Total: ${totalCost.toFixed(2)}
          </div>
        </div>

        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      {apiError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          onClick={handleCreate}
          disabled={saving || !supplierId || items.length === 0 || items.some((i) => !i.description.trim())}
        >
          {saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
          ) : (
            "Create PO"
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/purchase-orders?status=${filter}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error("Failed to fetch POs:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchRelations = useCallback(async () => {
    try {
      const [suppRes, matRes, conRes] = await Promise.all([
        fetch("/api/suppliers"),
        fetch("/api/materials"),
        fetch("/api/consumables"),
      ]);
      if (suppRes.ok) setSuppliers(await suppRes.json());
      if (matRes.ok) setMaterials(await matRes.json());
      if (conRes.ok) setConsumables(await conRes.json());
    } catch (err) {
      console.error("Failed to fetch relations:", err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchRelations();
  }, [fetchRelations]);

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
            onChange={(e) => setFilter(e.target.value)}
            options={STATUS_OPTIONS}
            className="w-36"
          />
          <span className="text-sm text-muted-foreground">
            {orders.length} order{orders.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Purchase Order
        </Button>
      </div>

      {/* Empty state */}
      {orders.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16">
            <ShoppingCart className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No purchase orders yet.</p>
            <Button variant="secondary" className="mt-2" onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first PO
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Desktop table */}
      {orders.length > 0 && (
        <div className="hidden md:block">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">PO #</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Supplier</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-center">Items</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Total</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Expected</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((po) => (
                    <tr
                      key={po.id}
                      className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/purchase-orders/${po.id}`} className="font-medium text-primary hover:underline">
                          {po.poNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{po.supplier.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANTS[po.status] ?? "default"}>
                          {po.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">{po.items.length}</td>
                      <td className="px-4 py-3 text-right tabular-nums">${po.totalCost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {po.expectedDelivery
                          ? new Date(po.expectedDelivery).toLocaleDateString("en-AU")
                          : "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(po.createdAt).toLocaleDateString("en-AU")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Mobile cards */}
      {orders.length > 0 && (
        <div className="space-y-3 md:hidden">
          {orders.map((po) => (
            <Link key={po.id} href={`/purchase-orders/${po.id}`}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-primary">{po.poNumber}</p>
                      <p className="text-sm text-muted-foreground">{po.supplier.name}</p>
                    </div>
                    <Badge variant={STATUS_VARIANTS[po.status] ?? "default"}>
                      {po.status}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Items</span>
                      <p className="font-medium">{po.items.length}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total</span>
                      <p className="font-medium">${po.totalCost.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date</span>
                      <p className="font-medium">
                        {new Date(po.createdAt).toLocaleDateString("en-AU")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create PO modal */}
      {showCreate && (
        <CreatePOModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchOrders}
          suppliers={suppliers}
          materials={materials}
          consumables={consumables}
          onSuppliersChanged={setSuppliers}
        />
      )}
    </div>
  );
}
