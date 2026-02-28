"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileUp, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { parseSTL, MAX_FILE_SIZE } from "@/lib/stl-parser";
import type { DrawingViews } from "@/lib/stl-drawing-renderer";

type Step = "upload" | "rendering" | "preview" | "saving";

export function NewDrawingForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);

  // File data
  const [filename, setFilename] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dimensions, setDimensions] = useState({ x: 0, y: 0, z: 0 });
  const [volumeCm3, setVolumeCm3] = useState(0);
  const [triangleCount, setTriangleCount] = useState(0);
  const [views, setViews] = useState<DrawingViews | null>(null);

  const handleFileDrop = useCallback(
    async (file: File) => {
      setError(null);

      if (!file.name.toLowerCase().endsWith(".stl")) {
        setError("Only STL files are supported");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError("File too large (max 50MB)");
        return;
      }

      const buffer = await file.arrayBuffer();

      // Parse STL for dimensions
      let parsed;
      try {
        parsed = parseSTL(buffer);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to parse STL file");
        return;
      }

      setFilename(file.name);
      setTitle(file.name.replace(/\.stl$/i, ""));
      setDimensions(parsed.dimensionsMm);
      setVolumeCm3(parsed.volumeCm3);
      setTriangleCount(parsed.triangleCount);

      // Render views
      setStep("rendering");
      try {
        const { renderDrawingViews } = await import("@/lib/stl-drawing-renderer");
        const rendered = await renderDrawingViews(buffer);
        setViews(rendered);
        setStep("preview");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to render drawing views");
        setStep("upload");
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileDrop(file);
    },
    [handleFileDrop]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileDrop(file);
    },
    [handleFileDrop]
  );

  async function handleSave() {
    if (!views) return;
    setStep("saving");
    setError(null);

    try {
      const res = await fetch("/api/drawings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || filename.replace(/\.stl$/i, ""),
          notes: notes.trim() || null,
          sourceFilename: filename,
          dimensionX: Math.round(dimensions.x * 100) / 100,
          dimensionY: Math.round(dimensions.y * 100) / 100,
          dimensionZ: Math.round(dimensions.z * 100) / 100,
          volumeCm3: Math.round(volumeCm3 * 100) / 100,
          triangleCount,
          viewFront: views.front,
          viewSide: views.side,
          viewTop: views.top,
          viewIso: views.iso,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save drawing");
      }

      const drawing = await res.json();
      router.push(`/drawings/${drawing.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save drawing");
      setStep("preview");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/drawings">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Part Drawing</h1>
          <p className="text-sm text-muted-foreground">
            Upload an STL file to generate orthographic views
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Upload step */}
      {step === "upload" && (
        <Card
          className="flex flex-col items-center justify-center border-2 border-dashed py-16 px-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-semibold">Drop an STL file here</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            or click to browse (max 50MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".stl"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button variant="secondary" className="mt-4" onClick={(e) => e.stopPropagation()}>
            <FileUp className="mr-2 h-4 w-4" />
            Select File
          </Button>
        </Card>
      )}

      {/* Rendering step */}
      {step === "rendering" && (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <h3 className="mt-4 text-lg font-semibold">Generating views...</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Rendering front, side, top, and isometric views
          </p>
        </Card>
      )}

      {/* Preview step */}
      {(step === "preview" || step === "saving") && views && (
        <div className="space-y-6">
          {/* 4-view grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="overflow-hidden">
              <div className="border-b bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Front View
              </div>
              <div className="aspect-[4/3] bg-white p-2">
                <img src={views.front} alt="Front view" className="h-full w-full object-contain" />
              </div>
            </Card>
            <Card className="overflow-hidden">
              <div className="border-b bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Side View
              </div>
              <div className="aspect-[4/3] bg-white p-2">
                <img src={views.side} alt="Side view" className="h-full w-full object-contain" />
              </div>
            </Card>
            <Card className="overflow-hidden">
              <div className="border-b bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Top View
              </div>
              <div className="aspect-[4/3] bg-white p-2">
                <img src={views.top} alt="Top view" className="h-full w-full object-contain" />
              </div>
            </Card>
            <Card className="overflow-hidden">
              <div className="border-b bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Isometric View
              </div>
              <div className="aspect-[4/3] bg-white p-2">
                <img src={views.iso} alt="Isometric view" className="h-full w-full object-contain" />
              </div>
            </Card>
          </div>

          {/* Metadata form */}
          <Card className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Drawing title"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Dimensions summary */}
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="text-sm font-semibold mb-2">STL Properties</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">File:</span>{" "}
                  <span className="font-medium">{filename}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Triangles:</span>{" "}
                  <span className="font-medium">{triangleCount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Dimensions:</span>{" "}
                  <span className="font-medium">
                    {dimensions.x.toFixed(1)} × {dimensions.y.toFixed(1)} × {dimensions.z.toFixed(1)} mm
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Volume:</span>{" "}
                  <span className="font-medium">{volumeCm3.toFixed(2)} cm³</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setStep("upload");
                setViews(null);
                setFilename("");
                setTitle("");
                setNotes("");
              }}
              disabled={step === "saving"}
            >
              Start Over
            </Button>
            <Button onClick={handleSave} disabled={step === "saving"}>
              {step === "saving" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Drawing"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
