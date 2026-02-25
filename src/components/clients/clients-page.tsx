"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { tagColour, BANNER } from "@/lib/status-colours";
import { Download } from "lucide-react";

// ---------- Types ----------

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  billingAddress: string | null;
  shippingAddress: string | null;
  shippingSameAsBilling: boolean;
  tags: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { quotes: number };
}

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  billingAddress: string;
  shippingAddress: string;
  shippingSameAsBilling: boolean;
  tags: string;
  notes: string;
}

const emptyForm: ClientFormData = {
  name: "",
  email: "",
  phone: "",
  company: "",
  billingAddress: "",
  shippingAddress: "",
  shippingSameAsBilling: true,
  tags: "",
  notes: "",
};

// ---------- Helpers ----------

const TAG_FILTER_OPTIONS = ["All", "Tradie", "EV Owner", "Maker", "Commercial", "Other"] as const;

function clientToFormData(client: Client): ClientFormData {
  return {
    name: client.name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    company: client.company ?? "",
    billingAddress: client.billingAddress ?? "",
    shippingAddress: client.shippingAddress ?? "",
    shippingSameAsBilling: client.shippingSameAsBilling,
    tags: client.tags.join(", "),
    notes: client.notes ?? "",
  };
}

function formDataToPayload(form: ClientFormData) {
  return {
    name: form.name.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    company: form.company.trim() || null,
    billingAddress: form.billingAddress.trim() || null,
    shippingAddress: form.shippingSameAsBilling
      ? null
      : (form.shippingAddress.trim() || null),
    shippingSameAsBilling: form.shippingSameAsBilling,
    tags: form.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0),
    notes: form.notes.trim() || null,
  };
}

// ---------- Component ----------

export function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientFormData>(emptyForm);

  // Filter state
  const [tagFilter, setTagFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // --- Fetch clients ---

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/clients");
      if (!res.ok) throw new Error("Failed to fetch clients");
      const data = await res.json();
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // --- Filtered clients ---

  const filteredClients = clients.filter((client) => {
    // Tag filter
    if (tagFilter !== "All") {
      if (tagFilter === "Other") {
        const knownTags = ["tradie", "ev owner", "maker", "commercial"];
        const hasKnown = client.tags.some((t) => knownTags.includes(t.toLowerCase()));
        if (hasKnown || client.tags.length === 0) return false;
      } else {
        if (!client.tags.some((t) => t.toLowerCase() === tagFilter.toLowerCase())) {
          return false;
        }
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const searchable = [
        client.name,
        client.email,
        client.phone,
        client.company,
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

  function openEdit(client: Client, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(client.id);
    setForm(clientToFormData(client));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function updateField(field: keyof ClientFormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Client name is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload = formDataToPayload(form);
      const url = editingId ? `/api/clients/${editingId}` : "/api/clients";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error || `Failed to ${editingId ? "update" : "create"} client`
        );
      }

      closeModal();
      await fetchClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(client: Client, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${client.name}"? This cannot be undone.`)) return;

    try {
      setError(null);
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        throw new Error("Failed to delete client");
      }
      await fetchClients();
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
          <h2 className="text-lg font-semibold text-foreground">Clients</h2>
          <p className="text-sm text-muted-foreground">
            Manage your client contacts and view their quote history.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              window.location.href = "/api/export/clients";
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={openAdd}>Add Client</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          options={TAG_FILTER_OPTIONS.map((tag) => ({
            value: tag,
            label: tag === "All" ? "All Tags" : tag,
          }))}
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
        <p className="text-sm text-muted-foreground">Loading clients...</p>
      )}

      {/* Empty state */}
      {!loading && clients.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              No clients yet. Add your first client to get started.
            </p>
            <Button onClick={openAdd}>Add Client</Button>
          </CardContent>
        </Card>
      )}

      {/* No results for filter */}
      {!loading && clients.length > 0 && filteredClients.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              No clients match your current filters.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Client cards grid */}
      {!loading && filteredClients.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => router.push(`/clients/${client.id}`)}
              onEdit={(e) => openEdit(client, e)}
              onDelete={(e) => handleDelete(client, e)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {modalOpen && (
        <ClientModal
          title={editingId ? "Edit Client" : "Add Client"}
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

// ---------- Client Card ----------

function ClientCard({
  client,
  onClick,
  onEdit,
  onDelete,
}: {
  client: Client;
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
            <CardTitle className="truncate text-base">{client.name}</CardTitle>
            {client.company && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {client.company}
              </p>
            )}
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
        <div className="space-y-1 text-sm">
          {client.email && (
            <p className="truncate text-muted-foreground">{client.email}</p>
          )}
          {client.phone && (
            <p className="text-muted-foreground">{client.phone}</p>
          )}
        </div>

        {/* Tags */}
        {client.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {client.tags.map((tag) => (
              <Badge key={tag} variant="outline" className={tagColour(tag)}>
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Quote count */}
        <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
          <span className="text-muted-foreground">Quotes</span>
          <span className="font-medium text-foreground">
            {client._count.quotes}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Modal ----------

function ClientModal({
  title,
  form,
  saving,
  onFieldChange,
  onSave,
  onClose,
}: {
  title: string;
  form: ClientFormData;
  saving: boolean;
  onFieldChange: (field: keyof ClientFormData, value: string | boolean) => void;
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
          placeholder="e.g. John Smith"
        />

        {/* Email & Phone */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => onFieldChange("email", e.target.value)}
            placeholder="john@example.com"
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => onFieldChange("phone", e.target.value)}
            placeholder="0412 345 678"
          />
        </div>

        {/* Company */}
        <Input
          label="Company"
          value={form.company}
          onChange={(e) => onFieldChange("company", e.target.value)}
          placeholder="e.g. Smith Electrical"
        />

        {/* Billing Address */}
        <Textarea
          label="Billing Address"
          value={form.billingAddress}
          onChange={(e) => onFieldChange("billingAddress", e.target.value)}
          placeholder="123 Main St, Sydney NSW 2000"
          className="min-h-[60px]"
        />

        {/* Shipping same as billing */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.shippingSameAsBilling}
            onChange={(e) => onFieldChange("shippingSameAsBilling", e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <span className="text-sm text-foreground">
            Shipping address same as billing
          </span>
        </label>

        {/* Shipping Address */}
        {!form.shippingSameAsBilling && (
          <Textarea
            label="Shipping Address"
            value={form.shippingAddress}
            onChange={(e) => onFieldChange("shippingAddress", e.target.value)}
            placeholder="456 Other St, Melbourne VIC 3000"
            className="min-h-[60px]"
          />
        )}

        {/* Tags */}
        <Input
          label="Tags"
          value={form.tags}
          onChange={(e) => onFieldChange("tags", e.target.value)}
          placeholder="Tradie, Commercial (comma-separated)"
        />
        <p className="!mt-1 text-xs text-muted-foreground">
          Common tags: Tradie, EV Owner, Maker, Commercial
        </p>

        {/* Notes */}
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => onFieldChange("notes", e.target.value)}
          placeholder="Any notes about this client..."
        />

        {/* Actions */}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save Client"}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
