"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BANNER } from "@/lib/status-colours";
import { Plus, Trash2, Loader2, Zap, Copy, Check } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Webhook {
  id: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  lastFiredAt: string | null;
  lastStatus: number | null;
  createdAt: string;
}

const EVENT_OPTIONS = [
  "quote.created",
  "quote.updated",
  "quote.accepted",
  "quote.rejected",
  "job.created",
  "job.updated",
  "job.completed",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WebhookSettings() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/webhooks");
      if (!res.ok) throw new Error("Failed to fetch webhooks");
      const data = await res.json();
      setWebhooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  function openAdd() {
    setEditingId(null);
    setUrl("");
    setEvents([]);
    setModalOpen(true);
  }

  function openEdit(webhook: Webhook) {
    setEditingId(webhook.id);
    setUrl(webhook.url);
    setEvents(webhook.events);
    setModalOpen(true);
  }

  function toggleEvent(event: string) {
    setEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    );
  }

  async function handleSave() {
    if (!url.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const endpoint = editingId ? `/api/webhooks/${editingId}` : "/api/webhooks";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, events }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save webhook");
      }

      setModalOpen(false);
      await fetchWebhooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this webhook?")) return;

    try {
      setError(null);
      const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete");
      await fetchWebhooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleToggleActive(webhook: Webhook) {
    try {
      setError(null);
      await fetch(`/api/webhooks/${webhook.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !webhook.active }),
      });
      await fetchWebhooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleTest(id: string) {
    setTestingId(id);
    setTestResult(null);

    try {
      const res = await fetch(`/api/webhooks/${id}/test`, { method: "POST" });
      const data = await res.json();
      setTestResult(
        data.success
          ? `Test sent (${data.status})`
          : data.message || `Failed (${data.status})`
      );
    } catch {
      setTestResult("Connection failed");
    } finally {
      setTestingId(null);
    }
  }

  async function copySecret(webhook: Webhook) {
    await navigator.clipboard.writeText(webhook.secret);
    setCopiedId(webhook.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Webhooks</CardTitle>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Webhook
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className={BANNER.error}>{error}</div>}

        {testResult && (
          <div className="rounded-md border border-info/30 bg-info/10 p-3 text-sm text-info-foreground">
            {testResult}
          </div>
        )}

        {webhooks.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No webhooks configured. Add one to receive event notifications.
          </p>
        )}

        {webhooks.map((webhook) => (
          <div
            key={webhook.id}
            className="rounded-lg border border-border p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{webhook.url}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={webhook.active ? "success" : "secondary"}>
                    {webhook.active ? "Active" : "Inactive"}
                  </Badge>
                  {webhook.lastStatus !== null && (
                    <span className="text-xs text-muted-foreground">
                      Last: {webhook.lastStatus === 0 ? "Failed" : webhook.lastStatus}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(webhook)}
                  className="h-8 text-xs"
                >
                  {webhook.active ? "Disable" : "Enable"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(webhook)}
                  className="h-8 text-xs"
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(webhook.id)}
                  className="h-8 text-xs text-destructive-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Events */}
            {webhook.events.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {webhook.events.map((event) => (
                  <Badge key={event} variant="outline" className="text-xs">
                    {event}
                  </Badge>
                ))}
              </div>
            )}

            {/* Secret + Test */}
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">
                {webhook.secret.slice(0, 12)}...
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copySecret(webhook)}
                className="h-7 text-xs"
              >
                {copiedId === webhook.id ? (
                  <Check className="mr-1 h-3 w-3" />
                ) : (
                  <Copy className="mr-1 h-3 w-3" />
                )}
                {copiedId === webhook.id ? "Copied" : "Copy Secret"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleTest(webhook.id)}
                disabled={testingId === webhook.id}
                className="h-7 text-xs"
              >
                {testingId === webhook.id ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Zap className="mr-1 h-3 w-3" />
                )}
                Test
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <Dialog open={true} onClose={() => setModalOpen(false)}>
          <DialogHeader onClose={() => setModalOpen(false)}>
            <DialogTitle>{editingId ? "Edit Webhook" : "Add Webhook"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label="Endpoint URL"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhook"
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Events
              </label>
              <div className="grid grid-cols-2 gap-2">
                {EVENT_OPTIONS.map((event) => (
                  <label
                    key={event}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={events.includes(event)}
                      onChange={() => toggleEvent(event)}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <span className="text-sm">{event}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Leave empty to receive all events.
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !url.trim()}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Webhook"
                )}
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}
    </Card>
  );
}
