"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TagInput } from "@/components/ui/tag-input";
import { tagColour, BANNER } from "@/lib/status-colours";
import { SkeletonListPage } from "@/components/ui/skeleton";
import { Download } from "lucide-react";
import { COUNTRY_OPTIONS } from "@/lib/tax-regions";

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
  paymentTermsDays: number;
  country: string | null;
  stateProvince: string | null;
  taxExempt: boolean;
  taxIdNumber: string | null;
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
  tags: string[];
  notes: string;
  paymentTermsDays: number;
  country: string;
  stateProvince: string;
  taxExempt: boolean;
  taxIdNumber: string;
}

const PAYMENT_TERMS_OPTIONS = [
  { value: 0, label: "Due on receipt" },
  { value: 7, label: "Net 7" },
  { value: 14, label: "Net 14" },
  { value: 30, label: "Net 30" },
  { value: 60, label: "Net 60" },
];

function paymentTermsLabel(days: number): string {
  if (days === 0) return "Due on receipt";
  return `Net ${days}`;
}

const emptyForm: ClientFormData = {
  name: "",
  email: "",
  phone: "",
  company: "",
  billingAddress: "",
  shippingAddress: "",
  shippingSameAsBilling: true,
  tags: [],
  notes: "",
  paymentTermsDays: 14,
  country: "",
  stateProvince: "",
  taxExempt: false,
  taxIdNumber: "",
};

const SUGGESTED_TAGS = ["Tradie", "EV Owner", "Maker", "Commercial"];

// ---------- Helpers ----------

function clientToFormData(client: Client): ClientFormData {
  return {
    name: client.name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    company: client.company ?? "",
    billingAddress: client.billingAddress ?? "",
    shippingAddress: client.shippingAddress ?? "",
    shippingSameAsBilling: client.shippingSameAsBilling,
    tags: [...client.tags],
    notes: client.notes ?? "",
    paymentTermsDays: client.paymentTermsDays ?? 14,
    country: client.country ?? "",
    stateProvince: client.stateProvince ?? "",
    taxExempt: client.taxExempt ?? false,
    taxIdNumber: client.taxIdNumber ?? "",
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
    tags: form.tags.map((t) => t.trim()).filter((t) => t.length > 0),
    notes: form.notes.trim() || null,
    paymentTermsDays: form.paymentTermsDays,
    country: form.country.trim() || null,
    stateProvince: form.stateProvince.trim() || null,
    taxExempt: form.taxExempt,
    taxIdNumber: form.taxIdNumber.trim() || null,
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
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
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

  // --- Collect all unique tags across all clients ---

  const allTags = Array.from(
    new Set(clients.flatMap((c) => c.tags))
  ).sort((a, b) => a.localeCompare(b));

  // --- Filtered clients ---

  const filteredClients = clients.filter((client) => {
    // Tag filter
    if (activeTagFilter) {
      if (
        !client.tags.some(
          (t) => t.toLowerCase() === activeTagFilter.toLowerCase()
        )
      ) {
        return false;
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

  function updateField(field: keyof ClientFormData, value: string | boolean | string[] | number) {
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
      <div className="-mx-4 md:-mx-6 px-4 md:px-6 pb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
      <div className="space-y-3">
        <Input
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:max-w-xs"
        />

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Filter by tag:
            </span>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setActiveTagFilter((prev) =>
                    prev?.toLowerCase() === tag.toLowerCase() ? null : tag
                  )
                }
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                  activeTagFilter?.toLowerCase() === tag.toLowerCase()
                    ? cn(tagColour(tag), "ring-2 ring-ring ring-offset-1 ring-offset-background")
                    : cn(tagColour(tag), "opacity-60 hover:opacity-100")
                )}
              >
                {tag}
              </button>
            ))}
            {activeTagFilter && (
              <button
                type="button"
                onClick={() => setActiveTagFilter(null)}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className={BANNER.error}>
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && <SkeletonListPage />}

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

        {/* Payment terms & quote count */}
        <div className="space-y-1.5 border-t border-border pt-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Payment Terms</span>
            <span className="font-medium text-foreground">
              {paymentTermsLabel(client.paymentTermsDays)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Quotes</span>
            <span className="font-medium text-foreground">
              {client._count.quotes}
            </span>
          </div>
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
  onFieldChange: (field: keyof ClientFormData, value: string | boolean | string[] | number) => void;
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
        <TagInput
          label="Tags"
          value={form.tags}
          onChange={(tags) => onFieldChange("tags", tags)}
          placeholder="Add a tag..."
          suggestions={SUGGESTED_TAGS}
        />

        {/* Payment Terms */}
        <Select
          label="Payment Terms"
          value={String(form.paymentTermsDays)}
          onChange={(e) => onFieldChange("paymentTermsDays", parseInt(e.target.value))}
          options={PAYMENT_TERMS_OPTIONS.map((opt) => ({
            value: String(opt.value),
            label: opt.label,
          }))}
        />

        {/* Country */}
        <Select
          label="Country"
          value={form.country}
          onChange={(e) => onFieldChange("country", e.target.value)}
          options={COUNTRY_OPTIONS}
        />

        {/* State / Province */}
        {form.country && (
          <Input
            label="State / Province"
            value={form.stateProvince}
            onChange={(e) => onFieldChange("stateProvince", e.target.value)}
            placeholder="e.g. NSW, CA, ON"
          />
        )}

        {/* Tax Exempt */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.taxExempt}
            onChange={(e) => onFieldChange("taxExempt", e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <span className="text-sm text-foreground">Tax exempt</span>
        </label>

        {/* Client Tax ID */}
        {form.taxExempt && (
          <Input
            label="Tax ID Number"
            value={form.taxIdNumber}
            onChange={(e) => onFieldChange("taxIdNumber", e.target.value)}
            placeholder="Client's ABN/VAT/EIN"
          />
        )}

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
