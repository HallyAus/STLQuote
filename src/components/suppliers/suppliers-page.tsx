"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BANNER } from "@/lib/status-colours";
import { Package, Plus, Globe, Mail, Phone } from "lucide-react";

// ---------- Types ----------

interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { items: number };
}

interface SupplierFormData {
  name: string;
  email: string;
  phone: string;
  website: string;
  notes: string;
}

const emptyForm: SupplierFormData = {
  name: "",
  email: "",
  phone: "",
  website: "",
  notes: "",
};

// ---------- Helpers ----------

function supplierToFormData(supplier: Supplier): SupplierFormData {
  return {
    name: supplier.name,
    email: supplier.email ?? "",
    phone: supplier.phone ?? "",
    website: supplier.website ?? "",
    notes: supplier.notes ?? "",
  };
}

function formDataToPayload(form: SupplierFormData) {
  return {
    name: form.name.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    website: form.website.trim() || null,
    notes: form.notes.trim() || null,
  };
}

// ---------- Component ----------

export function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierFormData>(emptyForm);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");

  // --- Fetch suppliers ---

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/suppliers");
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      const data = await res.json();
      setSuppliers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // --- Filtered suppliers ---

  const filteredSuppliers = suppliers.filter((supplier) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const searchable = [
        supplier.name,
        supplier.email,
        supplier.phone,
        supplier.website,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  // --- Handlers ---

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(supplier: Supplier, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(supplier.id);
    setForm(supplierToFormData(supplier));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function updateField(field: keyof SupplierFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Supplier name is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload = formDataToPayload(form);
      const url = editingId ? `/api/suppliers/${editingId}` : "/api/suppliers";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error || `Failed to ${editingId ? "update" : "create"} supplier`
        );
      }

      closeModal();
      await fetchSuppliers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(supplier: Supplier, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${supplier.name}"? This will also delete all supplied items. This cannot be undone.`)) return;

    try {
      setError(null);
      const res = await fetch(`/api/suppliers/${supplier.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        throw new Error("Failed to delete supplier");
      }
      await fetchSuppliers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Suppliers</h2>
          <p className="text-sm text-muted-foreground">
            Manage your material and parts suppliers.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      {/* Search filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search suppliers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className={BANNER.error}>
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <p className="text-sm text-muted-foreground">Loading suppliers...</p>
      )}

      {/* Empty state */}
      {!loading && suppliers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">
              No suppliers yet. Add your first supplier to get started.
            </p>
            <Button onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Supplier
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No results for filter */}
      {!loading && suppliers.length > 0 && filteredSuppliers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              No suppliers match your search.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Supplier cards grid */}
      {!loading && filteredSuppliers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSuppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              onClick={() => router.push(`/suppliers/${supplier.id}`)}
              onEdit={(e) => openEdit(supplier, e)}
              onDelete={(e) => handleDelete(supplier, e)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {modalOpen && (
        <SupplierModal
          title={editingId ? "Edit Supplier" : "Add Supplier"}
          form={form}
          saving={saving}
          onFieldChange={updateField}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// ---------- Supplier Card ----------

function SupplierCard({
  supplier,
  onClick,
  onEdit,
  onDelete,
}: {
  supplier: Supplier;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{supplier.name}</CardTitle>
          </div>
          <div className="ml-2 flex gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Contact details */}
        <div className="space-y-1.5 text-sm">
          {supplier.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{supplier.email}</span>
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{supplier.phone}</span>
            </div>
          )}
          {supplier.website && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{supplier.website}</span>
            </div>
          )}
        </div>

        {/* Item count */}
        <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
          <span className="text-muted-foreground">Supplied Items</span>
          <Badge variant="outline">
            {supplier._count.items}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Modal ----------

function SupplierModal({
  title,
  form,
  saving,
  onFieldChange,
  onSave,
  onClose,
}: {
  title: string;
  form: SupplierFormData;
  saving: boolean;
  onFieldChange: (field: keyof SupplierFormData, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={true} onClose={onClose}>
      <DialogHeader onClose={onClose}>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Name */}
        <Input
          label="Name *"
          value={form.name}
          onChange={(e) => onFieldChange("name", e.target.value)}
          placeholder="e.g. eSun Australia"
        />

        {/* Email & Phone */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => onFieldChange("email", e.target.value)}
            placeholder="sales@supplier.com"
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => onFieldChange("phone", e.target.value)}
            placeholder="1300 123 456"
          />
        </div>

        {/* Website */}
        <Input
          label="Website"
          value={form.website}
          onChange={(e) => onFieldChange("website", e.target.value)}
          placeholder="https://www.supplier.com.au"
        />

        {/* Notes */}
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => onFieldChange("notes", e.target.value)}
          placeholder="Any notes about this supplier..."
        />

        {/* Actions */}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save Supplier"}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
