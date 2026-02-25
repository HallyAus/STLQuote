"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn, roundCurrency } from "@/lib/utils";

// ---------- Types ----------

type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";

interface ClientQuote {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  total: number;
  createdAt: string;
}

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
  quotes: ClientQuote[];
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

function tagColour(tag: string): string {
  const lower = tag.toLowerCase();
  if (lower === "tradie") return "bg-orange-500/15 text-orange-600 dark:text-orange-400";
  if (lower === "ev owner") return "bg-green-500/15 text-green-600 dark:text-green-400";
  if (lower === "maker") return "bg-blue-500/15 text-blue-600 dark:text-blue-400";
  if (lower === "commercial") return "bg-purple-500/15 text-purple-600 dark:text-purple-400";
  return "bg-gray-500/15 text-gray-600 dark:text-gray-400";
}

function statusBadge(status: QuoteStatus) {
  const map: Record<QuoteStatus, { label: string; className: string }> = {
    DRAFT: { label: "Draft", className: "bg-gray-500/15 text-gray-500" },
    SENT: { label: "Sent", className: "bg-blue-500/15 text-blue-500" },
    ACCEPTED: { label: "Accepted", className: "bg-green-500/15 text-green-500" },
    REJECTED: { label: "Rejected", className: "bg-red-500/15 text-red-500" },
    EXPIRED: { label: "Expired", className: "bg-orange-500/15 text-orange-500" },
  };
  return map[status];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number): string {
  return `$${roundCurrency(value).toFixed(2)}`;
}

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

export function ClientDetail() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ClientFormData>(emptyForm);

  // Inline notes editing
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  // --- Fetch client ---

  const fetchClient = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/clients/${clientId}`);
      if (!res.ok) throw new Error("Failed to fetch client");
      const data: Client = await res.json();
      setClient(data);
      setNotesValue(data.notes ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  // --- Handlers ---

  function openEdit() {
    if (!client) return;
    setForm(clientToFormData(client));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
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

      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to update client");
      }

      closeModal();
      await fetchClient();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!client) return;
    if (!confirm(`Delete "${client.name}"? This cannot be undone.`)) return;

    try {
      setError(null);
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        throw new Error("Failed to delete client");
      }
      router.push("/clients");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleSaveNotes() {
    try {
      setNotesSaving(true);
      setError(null);
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesValue.trim() || null }),
      });

      if (!res.ok) {
        throw new Error("Failed to save notes");
      }

      setEditingNotes(false);
      await fetchClient();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setNotesSaving(false);
    }
  }

  // --- Loading / Not found ---

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Loading client...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Client not found.</p>
        <Button variant="secondary" onClick={() => router.push("/clients")}>
          Back to Clients
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
        onClick={() => router.push("/clients")}
      >
        &larr; Back to Clients
      </Button>

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Client header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl">{client.name}</CardTitle>
              {client.company && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {client.company}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={openEdit}>
                Edit
              </Button>
              <Button
                variant="ghost"
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                onClick={handleDelete}
              >
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
                {client.email ? (
                  <a
                    href={`mailto:${client.email}`}
                    className="text-primary hover:underline"
                  >
                    {client.email}
                  </a>
                ) : (
                  <span className="text-muted-foreground">&mdash;</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium">
                {client.phone ? (
                  <a
                    href={`tel:${client.phone}`}
                    className="text-primary hover:underline"
                  >
                    {client.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">&mdash;</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Billing Address</p>
              <p className="font-medium whitespace-pre-line">
                {client.billingAddress || (
                  <span className="text-muted-foreground">&mdash;</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Shipping Address</p>
              <p className="font-medium whitespace-pre-line">
                {client.shippingSameAsBilling ? (
                  <span className="italic text-muted-foreground">Same as billing</span>
                ) : (
                  client.shippingAddress || (
                    <span className="text-muted-foreground">&mdash;</span>
                  )
                )}
              </p>
            </div>
          </div>

          {/* Tags */}
          {client.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {client.tags.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    tagColour(tag)
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 text-xs text-muted-foreground">
            Client since {formatDate(client.createdAt)}
          </div>
        </CardContent>
      </Card>

      {/* Quote history */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quote History</CardTitle>
            <Button
              size="sm"
              onClick={() => router.push("/quotes/new")}
            >
              New Quote
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {client.quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <p className="text-sm text-muted-foreground">No quotes yet.</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push("/quotes/new")}
              >
                Create a Quote
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
                        Quote #
                      </th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                        Total
                      </th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.quotes.map((quote) => {
                      const badge = statusBadge(quote.status);
                      return (
                        <tr
                          key={quote.id}
                          className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                          onClick={() => router.push(`/quotes/${quote.id}`)}
                        >
                          <td className="px-3 py-2 font-medium">
                            {quote.quoteNumber}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-medium",
                                badge.className
                              )}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium">
                            {formatCurrency(quote.total)}
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {formatDate(quote.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {client.quotes.map((quote) => {
                  const badge = statusBadge(quote.status);
                  return (
                    <div
                      key={quote.id}
                      className="cursor-pointer rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                      onClick={() => router.push(`/quotes/${quote.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{quote.quoteNumber}</p>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {formatDate(quote.createdAt)}
                        </span>
                        <span className="font-semibold text-primary tabular-nums">
                          {formatCurrency(quote.total)}
                        </span>
                      </div>
                    </div>
                  );
                })}
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
                  setNotesValue(client.notes ?? "");
                  setEditingNotes(true);
                }}
              >
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
                placeholder="Add notes about this client..."
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingNotes(false);
                    setNotesValue(client.notes ?? "");
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
              {client.notes || "No notes yet."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit modal */}
      {modalOpen && (
        <ClientEditModal
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

// ---------- Edit Modal ----------

function ClientEditModal({
  form,
  saving,
  onFieldChange,
  onSave,
  onClose,
}: {
  form: ClientFormData;
  saving: boolean;
  onFieldChange: (field: keyof ClientFormData, value: string | boolean) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* Panel */}
      <div className="relative z-10 mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Edit Client
        </h2>

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
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Billing Address
            </label>
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={form.billingAddress}
              onChange={(e) => onFieldChange("billingAddress", e.target.value)}
              placeholder="123 Main St, Sydney NSW 2000"
            />
          </div>

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
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Shipping Address
              </label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.shippingAddress}
                onChange={(e) => onFieldChange("shippingAddress", e.target.value)}
                placeholder="456 Other St, Melbourne VIC 3000"
              />
            </div>
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
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Notes</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={form.notes}
              onChange={(e) => onFieldChange("notes", e.target.value)}
              placeholder="Any notes about this client..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save Client"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
