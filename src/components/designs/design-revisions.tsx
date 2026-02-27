"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GitBranch, Plus, Loader2 } from "lucide-react";

interface Revision {
  id: string;
  version: number;
  title: string;
  description: string | null;
  changes: string | null;
  createdAt: string;
  files: unknown[];
}

export function DesignRevisions({
  designId,
  revisions,
  onUpdate,
}: {
  designId: string;
  revisions: Revision[];
  onUpdate: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [changes, setChanges] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/designs/${designId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: description || null, changes: changes || null }),
      });
      if (res.ok) {
        setTitle("");
        setDescription("");
        setChanges("");
        setShowForm(false);
        onUpdate();
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{revisions.length} revision{revisions.length !== 1 ? "s" : ""}</h3>
        <Button size="sm" variant="secondary" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New Revision
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Added fillets to edges" required autoFocus />
              <div>
                <label className="text-sm font-medium text-foreground">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="What changed and why..."
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Changes</label>
                <textarea
                  value={changes}
                  onChange={(e) => setChanges(e.target.value)}
                  rows={2}
                  placeholder="Bullet point list of changes..."
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={creating}>
                  {creating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Create
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {revisions.length > 0 ? (
        <div className="relative ml-4 border-l-2 border-border pl-6 space-y-6">
          {revisions.map((rev) => (
            <div key={rev.id} className="relative">
              <div className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-border bg-background">
                <GitBranch className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary">v{rev.version}</span>
                  <span className="text-sm font-medium">{rev.title}</span>
                </div>
                {rev.description && <p className="text-sm text-muted-foreground">{rev.description}</p>}
                {rev.changes && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{rev.changes}</p>}
                <p className="text-[10px] text-muted-foreground">
                  {new Date(rev.createdAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No revisions yet. Create one to track design changes.
        </div>
      )}
    </div>
  );
}
