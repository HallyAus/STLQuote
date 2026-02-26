"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BANNER } from "@/lib/status-colours";
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  FileText,
  Copy,
} from "lucide-react";

interface QuoteTemplate {
  id: string;
  name: string;
  description: string | null;
  lineItems: string | null;
  markupPct: number;
  terms: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ClientOption {
  id: string;
  name: string;
  company: string | null;
}

function parseLineItems(json: string | null): Array<{ description: string; lineTotal: number; quantity: number }> {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Template Modal
// ---------------------------------------------------------------------------

function TemplateModal({
  title,
  template,
  onSave,
  onClose,
  saving,
}: {
  title: string;
  template: QuoteTemplate | null;
  onSave: (data: { name: string; description: string | null; markupPct: number; terms: string | null; notes: string | null }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [markupPct, setMarkupPct] = useState(String(template?.markupPct ?? 0));
  const [terms, setTerms] = useState(template?.terms ?? "");
  const [notes, setNotes] = useState(template?.notes ?? "");

  return (
    <Dialog open={true} onClose={onClose}>
      <DialogHeader onClose={onClose}>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <Input
          label="Template Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Standard print quote"
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this template is for..."
          className="min-h-[60px]"
        />
        <Input
          label="Default Markup %"
          type="number"
          min="0"
          step="1"
          value={markupPct}
          onChange={(e) => setMarkupPct(e.target.value)}
        />
        <Textarea
          label="Default Terms"
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          placeholder="Terms & conditions..."
          className="min-h-[60px]"
        />
        <Textarea
          label="Default Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes..."
          className="min-h-[60px]"
        />
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                name: name.trim(),
                description: description.trim() || null,
                markupPct: parseFloat(markupPct) || 0,
                terms: terms.trim() || null,
                notes: notes.trim() || null,
              })
            }
            disabled={saving || !name.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Create Quote from Template Modal
// ---------------------------------------------------------------------------

function CreateQuoteModal({
  template,
  clients,
  onClose,
}: {
  template: QuoteTemplate;
  clients: ClientOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientOptions = [
    { value: "", label: "-- Select a client --" },
    ...clients.map((c) => ({
      value: c.id,
      label: c.company ? `${c.name} (${c.company})` : c.name,
    })),
  ];

  async function handleCreate() {
    if (!clientId) {
      setError("Please select a client.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/quote-templates/${template.id}/create-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to create quote");
      }
      const quote = await res.json();
      router.push(`/quotes/${quote.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={true} onClose={onClose}>
      <DialogHeader onClose={onClose}>
        <DialogTitle>Create Quote from &ldquo;{template.name}&rdquo;</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {error && <div className={BANNER.error}>{error}</div>}
        <Select
          label="Client *"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          options={clientOptions}
        />
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving || !clientId}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Quote"
            )}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function QuoteTemplatesPage() {
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuoteTemplate | null>(null);
  const [createQuoteTemplate, setCreateQuoteTemplate] = useState<QuoteTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/quote-templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    async function loadClients() {
      const res = await fetch("/api/clients").catch(() => null);
      if (res?.ok) {
        const data = await res.json();
        setClients(
          data.map((c: { id: string; name: string; company: string | null }) => ({
            id: c.id,
            name: c.name,
            company: c.company,
          }))
        );
      }
    }
    loadClients();
  }, []);

  async function handleCreateTemplate(data: { name: string; description: string | null; markupPct: number; terms: string | null; notes: string | null }) {
    setSaving(true);
    try {
      const res = await fetch("/api/quote-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create template");
      setCreateModalOpen(false);
      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateTemplate(data: { name: string; description: string | null; markupPct: number; terms: string | null; notes: string | null }) {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/quote-templates/${editingTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update template");
      setEditingTemplate(null);
      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      setError(null);
      const res = await fetch(`/api/quote-templates/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete template");
      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

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
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </span>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {error && <div className={BANNER.error}>{error}</div>}

      {templates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              No templates yet. Create a template to speed up quoting.
            </p>
            <Button variant="secondary" className="mt-2" onClick={() => setCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => {
          const items = parseLineItems(t.lineItems);
          return (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <Badge variant="default">{items.length} items</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {t.description && (
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Markup: {t.markupPct}%</span>
                  {t.terms && <span>Has terms</span>}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => setCreateQuoteTemplate(t)}
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Create Quote
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingTemplate(t)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTemplate(t.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create template modal */}
      {createModalOpen && (
        <TemplateModal
          title="New Template"
          template={null}
          onSave={handleCreateTemplate}
          onClose={() => setCreateModalOpen(false)}
          saving={saving}
        />
      )}

      {/* Edit template modal */}
      {editingTemplate && (
        <TemplateModal
          title="Edit Template"
          template={editingTemplate}
          onSave={handleUpdateTemplate}
          onClose={() => setEditingTemplate(null)}
          saving={saving}
        />
      )}

      {/* Create quote from template modal */}
      {createQuoteTemplate && (
        <CreateQuoteModal
          template={createQuoteTemplate}
          clients={clients}
          onClose={() => setCreateQuoteTemplate(null)}
        />
      )}
    </div>
  );
}
