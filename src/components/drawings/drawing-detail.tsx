"use client";

import { useState, useEffect, useCallback } from "react";
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

interface Settings {
  businessName?: string;
  businessAddress?: string;
  businessAbn?: string;
}

export function DrawingDetail({ id }: { id: string }) {
  const router = useRouter();
  const [drawing, setDrawing] = useState<PartDrawing | null>(null);
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/drawings/${id}`).then((res) => {
        if (!res.ok) throw new Error("Drawing not found");
        return res.json();
      }),
      fetch("/api/settings").then((r) => (r.ok ? r.json() : {})),
    ])
      .then(([data, settingsData]) => {
        setDrawing(data);
        setSettings(settingsData);
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

  const handlePrint = useCallback(() => {
    if (!drawing) return;
    const businessName = settings.businessName || "Printforge";
    const filename = `${drawing.drawingNumber} - ${businessName}`;

    const dateStr = new Date(drawing.createdAt).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${filename}</title>
  <style>
    @page { size: A3 landscape; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      background: white;
      color: black;
    }
    .sheet {
      width: 100%;
      max-width: 1580px;
      margin: 0 auto;
    }
    .border {
      border: 2px solid black;
      padding: 14px;
    }
    .views {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 10px;
    }
    .view-cell {
      border: 1px solid #d4d4d8;
      position: relative;
    }
    .view-label {
      position: absolute;
      top: 5px;
      left: 10px;
      font-size: 11px;
      font-weight: 600;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .view-dim {
      position: absolute;
      bottom: 5px;
      right: 10px;
      font-size: 10px;
      font-family: monospace;
      color: #71717a;
    }
    .view-img-wrap {
      aspect-ratio: 4/3;
      padding: 24px 10px 10px;
    }
    .view-img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .title-block {
      border: 2px solid black;
      display: grid;
      grid-template-columns: 1fr auto;
    }
    .tb-left {
      border-right: 1px solid black;
      padding: 10px 14px;
    }
    .tb-biz {
      font-size: 16px;
      font-weight: 700;
    }
    .tb-sub {
      font-size: 10px;
      color: #71717a;
      margin-top: 2px;
    }
    .tb-notes {
      font-size: 10px;
      color: #52525b;
      margin-top: 6px;
      border-top: 1px solid #e4e4e7;
      padding-top: 6px;
    }
    .tb-right { min-width: 320px; }
    .tb-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 7px 14px;
      border-bottom: 1px solid black;
    }
    .tb-row:last-child { border-bottom: none; }
    .tb-label {
      font-size: 10px;
      font-weight: 600;
      color: #71717a;
    }
    .tb-value {
      font-size: 13px;
      font-weight: 600;
      font-family: monospace;
    }
    .tb-value-lg {
      font-size: 16px;
      font-weight: 700;
      font-family: monospace;
    }
    .tb-grid {
      display: grid;
      border-bottom: 1px solid black;
    }
    .tb-grid-2 { grid-template-columns: 1fr 1fr; }
    .tb-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
    .tb-cell {
      padding: 5px 14px;
    }
    .tb-cell + .tb-cell {
      border-left: 1px solid black;
    }
    .tb-cell-label {
      font-size: 9px;
      font-weight: 600;
      color: #71717a;
    }
    .tb-cell-value {
      font-size: 11px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="border">
      <div class="views">
        <div class="view-cell">
          <div class="view-label">Front View</div>
          <div class="view-dim">${drawing.dimensionX.toFixed(1)} × ${drawing.dimensionZ.toFixed(1)} mm</div>
          <div class="view-img-wrap"><img src="${drawing.viewFront}" alt="Front" /></div>
        </div>
        <div class="view-cell">
          <div class="view-label">Side View</div>
          <div class="view-dim">${drawing.dimensionY.toFixed(1)} × ${drawing.dimensionZ.toFixed(1)} mm</div>
          <div class="view-img-wrap"><img src="${drawing.viewSide}" alt="Side" /></div>
        </div>
        <div class="view-cell">
          <div class="view-label">Top View</div>
          <div class="view-dim">${drawing.dimensionX.toFixed(1)} × ${drawing.dimensionY.toFixed(1)} mm</div>
          <div class="view-img-wrap"><img src="${drawing.viewTop}" alt="Top" /></div>
        </div>
        <div class="view-cell">
          <div class="view-label">Isometric View</div>
          <div class="view-img-wrap"><img src="${drawing.viewIso}" alt="Isometric" /></div>
        </div>
      </div>

      <div class="title-block">
        <div class="tb-left">
          <div class="tb-biz">${businessName}</div>
          ${settings.businessAddress ? `<div class="tb-sub">${settings.businessAddress}</div>` : ""}
          ${settings.businessAbn ? `<div class="tb-sub">ABN: ${settings.businessAbn}</div>` : ""}
          ${drawing.notes ? `<div class="tb-notes">${drawing.notes}</div>` : ""}
        </div>
        <div class="tb-right">
          <div class="tb-row">
            <span class="tb-label">DRAWING NO.</span>
            <span class="tb-value-lg">${drawing.drawingNumber}</span>
          </div>
          <div class="tb-row">
            <span class="tb-label">TITLE</span>
            <span class="tb-value">${drawing.title}</span>
          </div>
          <div class="tb-grid tb-grid-2">
            <div class="tb-cell">
              <div class="tb-cell-label">DATE</div>
              <div class="tb-cell-value">${dateStr}</div>
            </div>
            <div class="tb-cell">
              <div class="tb-cell-label">SCALE</div>
              <div class="tb-cell-value">N.T.S.</div>
            </div>
          </div>
          <div class="tb-grid tb-grid-3">
            <div class="tb-cell">
              <div class="tb-cell-label">X (mm)</div>
              <div class="tb-cell-value">${drawing.dimensionX.toFixed(1)}</div>
            </div>
            <div class="tb-cell">
              <div class="tb-cell-label">Y (mm)</div>
              <div class="tb-cell-value">${drawing.dimensionY.toFixed(1)}</div>
            </div>
            <div class="tb-cell">
              <div class="tb-cell-label">Z (mm)</div>
              <div class="tb-cell-value">${drawing.dimensionZ.toFixed(1)}</div>
            </div>
          </div>
          <div class="tb-grid tb-grid-2">
            <div class="tb-cell">
              <div class="tb-cell-label">VOLUME</div>
              <div class="tb-cell-value">${drawing.volumeCm3.toFixed(2)} cm³</div>
            </div>
            <div class="tb-cell">
              <div class="tb-cell-label">FILE</div>
              <div class="tb-cell-value" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px">${drawing.sourceFilename}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script>
    document.title = ${JSON.stringify(filename)};
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`);
    printWindow.document.close();
  }, [drawing, settings]);

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
          <Button variant="secondary" onClick={handlePrint}>
            <PrinterIcon className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
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
