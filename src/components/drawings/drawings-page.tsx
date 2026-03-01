"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, PenTool, Ruler, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface DrawingSummary {
  id: string;
  drawingNumber: string;
  title: string;
  sourceFilename: string;
  dimensionX: number;
  dimensionY: number;
  dimensionZ: number;
  volumeCm3: number;
  triangleCount: number;
  viewIso: string;
  quoteId: string | null;
  designId: string | null;
  quote: { quoteNumber: string } | null;
  design: { designNumber: string; name: string } | null;
  createdAt: string;
}

function formatDimensions(x: number, y: number, z: number): string {
  return `${x.toFixed(1)} × ${y.toFixed(1)} × ${z.toFixed(1)} mm`;
}

export function DrawingsPage() {
  const [drawings, setDrawings] = useState<DrawingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/drawings")
      .then((res) => (res.ok ? res.json() : []))
      .then(setDrawings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this drawing? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/drawings/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDrawings((prev) => prev.filter((d) => d.id !== id));
      }
    } catch {}
    setDeleting(null);
  }

  const filtered = search
    ? drawings.filter(
        (d) =>
          d.title.toLowerCase().includes(search.toLowerCase()) ||
          d.drawingNumber.toLowerCase().includes(search.toLowerCase()) ||
          d.sourceFilename.toLowerCase().includes(search.toLowerCase())
      )
    : drawings;

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-end">
        <Link href="/drawings/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Drawing
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search drawings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <PenTool className="h-12 w-12 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-semibold">
            {search ? "No matching drawings" : "No drawings yet"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search
              ? "Try a different search term"
              : "Upload an STL file to generate your first technical drawing"}
          </p>
          {!search && (
            <Link href="/drawings/new" className="mt-4">
              <Button variant="secondary">
                <Plus className="mr-2 h-4 w-4" />
                Create Drawing
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((drawing) => (
            <Card
              key={drawing.id}
              className="group relative overflow-hidden transition-shadow hover:shadow-md"
            >
              {/* Isometric thumbnail */}
              <Link href={`/drawings/${drawing.id}`}>
                <div className="aspect-[4/3] bg-muted/30 p-4">
                  <img
                    src={drawing.viewIso}
                    alt={drawing.title}
                    className="h-full w-full object-contain"
                  />
                </div>
              </Link>

              {/* Info */}
              <div className="border-t p-4">
                <Link href={`/drawings/${drawing.id}`}>
                  <h3 className="font-semibold hover:text-primary transition-colors truncate">
                    {drawing.title}
                  </h3>
                </Link>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {drawing.drawingNumber}
                </p>

                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Ruler className="h-3 w-3 shrink-0" />
                  <span>{formatDimensions(drawing.dimensionX, drawing.dimensionY, drawing.dimensionZ)}</span>
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  {drawing.sourceFilename}
                </div>

                {(drawing.quote || drawing.design) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {drawing.quote && (
                      <span className="inline-flex items-center rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                        {drawing.quote.quoteNumber}
                      </span>
                    )}
                    {drawing.design && (
                      <span className="inline-flex items-center rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400">
                        {drawing.design.designNumber}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(drawing.createdAt).toLocaleDateString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(drawing.id)}
                    disabled={deleting === drawing.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
