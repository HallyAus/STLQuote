"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Loader2, FileText, X, Box, Clock, Weight, Ruler } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  parseSTL,
  estimateFromSTL,
  MATERIAL_DENSITIES,
  SPEED_PRESETS,
  MAX_FILE_SIZE,
  type SpeedPreset,
  type STLEstimates,
  type STLParseResult,
} from "@/lib/stl-parser";

interface STLUploadPanelProps {
  onEstimatesReady: (estimates: STLEstimates) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}

const materialOptions = Object.keys(MATERIAL_DENSITIES).map((m) => ({
  value: m,
  label: m,
}));

const speedPresets: { value: SpeedPreset; label: string }[] = [
  { value: "fast", label: "Fast" },
  { value: "standard", label: "Standard" },
  { value: "quality", label: "Quality" },
];

export function STLUploadPanel({ onEstimatesReady }: STLUploadPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<STLParseResult | null>(null);
  const [estimates, setEstimates] = useState<STLEstimates | null>(null);
  const [infillPercent, setInfillPercent] = useState(15);
  const [speedPreset, setSpeedPreset] = useState<SpeedPreset>("standard");
  const [materialType, setMaterialType] = useState("PLA");
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const recalculate = useCallback(
    (
      parseResult: STLParseResult,
      material: string,
      infill: number,
      speed: SpeedPreset,
      filename: string
    ) => {
      const newEstimates = estimateFromSTL(parseResult, {
        densityGPerCm3: MATERIAL_DENSITIES[material],
        infillPercent: infill,
        speedPreset: speed,
        filename,
      });
      setEstimates(newEstimates);
    },
    []
  );

  const processFile = useCallback(
    async (selectedFile: File) => {
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError(
          `File too large: ${formatFileSize(selectedFile.size)}. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`
        );
        return;
      }

      if (!selectedFile.name.toLowerCase().endsWith(".stl")) {
        setError("Invalid file type. Please upload an STL file.");
        return;
      }

      setFile(selectedFile);
      setParsing(true);
      setError(null);
      setResult(null);
      setEstimates(null);

      try {
        const buffer = await selectedFile.arrayBuffer();
        const parseResult = parseSTL(buffer);
        setResult(parseResult);
        recalculate(
          parseResult,
          materialType,
          infillPercent,
          speedPreset,
          selectedFile.name
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to parse STL file"
        );
        setFile(null);
        setResult(null);
        setEstimates(null);
      } finally {
        setParsing(false);
      }
    },
    [materialType, infillPercent, speedPreset, recalculate]
  );

  const clearFile = useCallback(() => {
    setFile(null);
    setResult(null);
    setEstimates(null);
    setError(null);
    setParsing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) processFile(droppedFile);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  }

  function handleMaterialChange(newMaterial: string) {
    setMaterialType(newMaterial);
    if (result && file) {
      recalculate(result, newMaterial, infillPercent, speedPreset, file.name);
    }
  }

  function handleInfillChange(newInfill: number) {
    const clamped = Math.min(100, Math.max(5, newInfill));
    setInfillPercent(clamped);
    if (result && file) {
      recalculate(result, materialType, clamped, speedPreset, file.name);
    }
  }

  function handleSpeedChange(newSpeed: SpeedPreset) {
    setSpeedPreset(newSpeed);
    if (result && file) {
      recalculate(result, materialType, infillPercent, newSpeed, file.name);
    }
  }

  // State 2 — Parsing
  if (parsing) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">
              Analysing STL file...
            </p>
            <p className="text-xs text-muted-foreground">
              Parsing geometry and calculating estimates
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <div className="rounded-full bg-destructive/10 p-3">
              <X className="h-6 w-6 text-destructive-foreground" />
            </div>
            <p className="text-sm font-medium text-destructive-foreground">
              {error}
            </p>
            <Button variant="secondary" size="sm" onClick={clearFile}>
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // State 3 — Results
  if (result && estimates && file) {
    return (
      <Card>
        <CardContent className="p-6 space-y-5">
          {/* Row 1 — File info bar */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
            <FileText className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)} &middot;{" "}
                {estimates.triangleCount.toLocaleString()} triangles
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearFile}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Row 2 — Analysis grid */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg bg-muted/50 px-4 py-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Box className="h-3.5 w-3.5" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Volume
                </span>
              </div>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {estimates.volumeCm3.toFixed(2)}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  cm&sup3;
                </span>
              </p>
            </div>

            <div className="rounded-lg bg-muted/50 px-4 py-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Ruler className="h-3.5 w-3.5" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Dimensions
                </span>
              </div>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {estimates.dimensionsMm.x.toFixed(1)}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  &times;
                </span>{" "}
                {estimates.dimensionsMm.y.toFixed(1)}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  &times;
                </span>{" "}
                {estimates.dimensionsMm.z.toFixed(1)}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  mm
                </span>
              </p>
            </div>

            <div className="rounded-lg bg-muted/50 px-4 py-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Weight className="h-3.5 w-3.5" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Est. Weight
                </span>
              </div>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {estimates.weightG.toFixed(1)}
                <span className="text-sm font-normal text-muted-foreground">
                  g
                </span>
              </p>
            </div>

            <div className="rounded-lg bg-muted/50 px-4 py-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Est. Time
                </span>
              </div>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatTime(estimates.printTimeMinutes)}
              </p>
            </div>
          </div>

          {/* Row 3 — Estimation controls */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-40">
              <Select
                label="Material"
                options={materialOptions}
                value={materialType}
                onChange={(e) => handleMaterialChange(e.target.value)}
              />
            </div>

            <div className="w-28">
              <Input
                label="Infill %"
                type="number"
                min={5}
                max={100}
                step={5}
                value={infillPercent}
                onChange={(e) =>
                  handleInfillChange(parseInt(e.target.value, 10) || 20)
                }
              />
            </div>

            <div className="space-y-1">
              <span className="text-sm font-medium text-foreground">
                Speed Preset
              </span>
              <div className="flex rounded-md border border-input bg-background p-0.5">
                {speedPresets.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleSpeedChange(value)}
                    className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                      speedPreset === value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 4 — Apply button */}
          <div className="space-y-2 pt-1">
            <Button
              className="w-full"
              onClick={() => onEstimatesReady(estimates)}
            >
              Apply to Calculator
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Estimates are approximate &mdash; adjust values after applying
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // State 1 — Empty (no file)
  return (
    <Card>
      <CardContent className="p-2">
        <div
          role="button"
          tabIndex={0}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/50"
          }`}
        >
          <div className="rounded-full bg-muted p-4">
            <Upload
              className={`h-8 w-8 ${
                dragActive ? "text-primary" : "text-muted-foreground"
              }`}
            />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">
            Drop your STL file here
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            or click to browse
          </p>
          <p className="mt-4 text-xs text-muted-foreground/70">
            Supports binary and ASCII STL files up to 50MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".stl"
            onChange={handleFileInput}
            className="hidden"
            aria-label="Upload STL file"
          />
        </div>
      </CardContent>
    </Card>
  );
}
