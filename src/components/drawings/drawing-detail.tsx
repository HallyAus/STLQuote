"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Printer as PrinterIcon,
  Trash2,
  Ruler,
  Box,
  Triangle,
  FileText,
  Save,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface PartDrawing {
  id: string;
  drawingNumber: string;
  title: string;
  notes: string | null;
  sourceFilename: string;
  sourceFileId: string | null;
  dimensionX: number;
  dimensionY: number;
  dimensionZ: number;
  volumeCm3: number;
  triangleCount: number;
  viewFront: string;
  viewSide: string;
  viewTop: string;
  viewIso: string;
  quoteId: string | null;
  designId: string | null;
  quote: { id: string; quoteNumber: string } | null;
  design: { id: string; designNumber: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export function DrawingDetail({ id }: { id: string }) {
  const router = useRouter();
  const [drawing, setDrawing] = useState<PartDrawing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/drawings/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Drawing not found");
        return res.json();
      })
      .then((data) => {
        setDrawing(data);
        setEditTitle(data.title);
        setEditNotes(data.notes || "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!drawing) return;
    setIsDirty(editTitle !== drawing.title || editNotes !== (drawing.notes || ""));
  }, [editTitle, editNotes, drawing]);

  async function handleSave() {
    if (!isDirty) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/drawings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          notes: editNotes.trim() || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDrawing((prev) => (prev ? { ...prev, ...updated } : prev));
        setIsDirty(false);
      }
    } catch {}
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this drawing? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/drawings/${id}`, { method: "DELETE" });
      if (res.ok) router.push("/drawings");
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !drawing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground">{error || "Drawing not found"}</p>
        <Link href="/drawings" className="mt-4">
          <Button variant="secondary">Back to Drawings</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/drawings">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{drawing.title}</h1>
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              {drawing.drawingNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/drawings/${id}/pdf`}>
            <Button variant="secondary">
              <PrinterIcon className="mr-2 h-4 w-4" />
              Print / PDF
            </Button>
          </Link>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 4-View Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          { label: "Front View", src: drawing.viewFront, dim: `${drawing.dimensionX.toFixed(1)} × ${drawing.dimensionZ.toFixed(1)} mm` },
          { label: "Side View", src: drawing.viewSide, dim: `${drawing.dimensionY.toFixed(1)} × ${drawing.dimensionZ.toFixed(1)} mm` },
          { label: "Top View", src: drawing.viewTop, dim: `${drawing.dimensionX.toFixed(1)} × ${drawing.dimensionY.toFixed(1)} mm` },
          { label: "Isometric View", src: drawing.viewIso, dim: null },
        ].map((view) => (
          <Card key={view.label} className="overflow-hidden">
            <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {view.label}
              </span>
              {view.dim && (
                <span className="text-[11px] font-mono text-muted-foreground">
                  {view.dim}
                </span>
              )}
            </div>
            <div className="aspect-[4/3] bg-white p-3">
              <img
                src={view.src}
                alt={view.label}
                className="h-full w-full object-contain"
              />
            </div>
          </Card>
        ))}
      </div>

      {/* Details + Edit */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Properties */}
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold">Properties</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Ruler className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Dimensions</span>
              <span className="ml-auto font-medium font-mono">
                {drawing.dimensionX.toFixed(1)} × {drawing.dimensionY.toFixed(1)} × {drawing.dimensionZ.toFixed(1)} mm
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Box className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Volume</span>
              <span className="ml-auto font-medium font-mono">
                {drawing.volumeCm3.toFixed(2)} cm³
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Triangle className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Triangles</span>
              <span className="ml-auto font-medium font-mono">
                {drawing.triangleCount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Source</span>
              <span className="ml-auto font-medium truncate max-w-[200px]">
                {drawing.sourceFilename}
              </span>
            </div>
          </div>

          {/* Linked items */}
          {(drawing.quote || drawing.design) && (
            <>
              <div className="h-px bg-border" />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Linked To</h4>
                {drawing.quote && (
                  <Link
                    href={`/quotes/${drawing.quote.id}`}
                    className="block text-sm text-primary hover:underline"
                  >
                    Quote {drawing.quote.quoteNumber}
                  </Link>
                )}
                {drawing.design && (
                  <Link
                    href={`/designs/${drawing.design.id}`}
                    className="block text-sm text-primary hover:underline"
                  >
                    Design {drawing.design.designNumber} — {drawing.design.name}
                  </Link>
                )}
              </div>
            </>
          )}

          <div className="h-px bg-border" />
          <div className="text-xs text-muted-foreground">
            Created {new Date(drawing.createdAt).toLocaleString()}
          </div>
        </Card>

        {/* Edit section */}
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold">Edit</h3>
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={4}
              placeholder="Optional notes..."
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {isDirty && (
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
