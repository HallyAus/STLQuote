"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Loader2, FileText, X, Weight, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  parseSTL,
  estimateFromSTL,
  MATERIAL_DENSITIES,
  SPEED_PRESETS,
  MAX_FILE_SIZE,
  type SpeedPreset,
  type STLParseResult,
} from "@/lib/stl-parser";
import { parseGcode, isGcodeFile } from "@/lib/gcode-parser";

export interface FileEstimates {
  type: "stl" | "gcode";
  filename: string;
  // STL fields
  weightG: number;
  printTimeMinutes: number;
  volumeCm3?: number;
  dimensionsMm?: { x: number; y: number; z: number };
  triangleCount?: number;
  // G-code fields
  materialType?: string | null;
  layerHeight?: number | null;
  nozzleTemp?: number | null;
  bedTemp?: number | null;
  slicer?: string | null;
}

interface ProcessedFile {
  file: File;
  estimates: FileEstimates;
  stlParseResult?: STLParseResult;
}

interface STLUploadPanelProps {
  onFileAdded: (estimates: FileEstimates) => void;
  onFileRemoved: (filename: string) => void;
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

const ACCEPTED_EXTENSIONS = ".stl,.gcode,.gco,.g";

function isAcceptedFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return (
    lower.endsWith(".stl") ||
    lower.endsWith(".gcode") ||
    lower.endsWith(".gco") ||
    lower.endsWith(".g")
  );
}

export function STLUploadPanel({ onFileAdded, onFileRemoved }: STLUploadPanelProps) {
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [processingCount, setProcessingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // STL estimation defaults (shared across all STL files)
  const [infillPercent, setInfillPercent] = useState(15);
  const [speedPreset, setSpeedPreset] = useState<SpeedPreset>("standard");
  const [materialType, setMaterialType] = useState("PLA");

  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const buildSTLEstimates = useCallback(
    (
      parseResult: STLParseResult,
      material: string,
      infill: number,
      speed: SpeedPreset,
      filename: string
    ): FileEstimates => {
      const stl = estimateFromSTL(parseResult, {
        densityGPerCm3: MATERIAL_DENSITIES[material],
        infillPercent: infill,
        speedPreset: speed,
        filename,
      });
      return {
        type: "stl",
        filename: stl.filename,
        weightG: stl.weightG,
        printTimeMinutes: stl.printTimeMinutes,
        volumeCm3: stl.volumeCm3,
        dimensionsMm: stl.dimensionsMm,
        triangleCount: stl.triangleCount,
      };
    },
    []
  );

  const processFile = useCallback(
    async (
      selectedFile: File,
      material: string,
      infill: number,
      speed: SpeedPreset
    ) => {
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError(
          `${selectedFile.name}: too large (${formatFileSize(selectedFile.size)}). Max ${formatFileSize(MAX_FILE_SIZE)}.`
        );
        return;
      }

      if (!isAcceptedFile(selectedFile.name)) {
        setError(`${selectedFile.name}: invalid file type.`);
        return;
      }

      setProcessingCount((c) => c + 1);
      setError(null);

      try {
        let estimates: FileEstimates;
        let stlParseResult: STLParseResult | undefined;

        if (isGcodeFile(selectedFile.name)) {
          const text = await selectedFile.text();
          const gcode = parseGcode(text, selectedFile.name);
          estimates = {
            type: "gcode",
            filename: gcode.filename,
            weightG: gcode.weightG ?? 0,
            printTimeMinutes: gcode.printTimeMinutes ?? 0,
            materialType: gcode.materialType,
            layerHeight: gcode.layerHeight,
            nozzleTemp: gcode.nozzleTemp,
            bedTemp: gcode.bedTemp,
            slicer: gcode.slicer,
          };
        } else {
          const buffer = await selectedFile.arrayBuffer();
          stlParseResult = parseSTL(buffer);
          estimates = buildSTLEstimates(
            stlParseResult,
            material,
            infill,
            speed,
            selectedFile.name
          );
        }

        const processed: ProcessedFile = {
          file: selectedFile,
          estimates,
          stlParseResult,
        };

        setProcessedFiles((prev) => {
          // Replace if same filename, otherwise append
          const existing = prev.findIndex(
            (p) => p.estimates.filename === estimates.filename
          );
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = processed;
            return updated;
          }
          return [...prev, processed];
        });

        onFileAdded(estimates);
      } catch (err) {
        setError(
          `${selectedFile.name}: ${err instanceof Error ? err.message : "Failed to parse"}`
        );
      } finally {
        setProcessingCount((c) => c - 1);
      }
    },
    [buildSTLEstimates, onFileAdded]
  );

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      for (const f of fileArray) {
        processFile(f, materialType, infillPercent, speedPreset);
      }
    },
    [processFile, materialType, infillPercent, speedPreset]
  );

  const removeFile = useCallback(
    (filename: string) => {
      setProcessedFiles((prev) =>
        prev.filter((p) => p.estimates.filename !== filename)
      );
      onFileRemoved(filename);
    },
    [onFileRemoved]
  );

  // When STL settings change, recalculate all STL files
  const recalculateAllSTL = useCallback(
    (material: string, infill: number, speed: SpeedPreset) => {
      setProcessedFiles((prev) => {
        const updated = prev.map((pf) => {
          if (pf.estimates.type !== "stl" || !pf.stlParseResult) return pf;
          const newEstimates = buildSTLEstimates(
            pf.stlParseResult,
            material,
            infill,
            speed,
            pf.estimates.filename
          );
          // Emit update to parent
          onFileAdded(newEstimates);
          return { ...pf, estimates: newEstimates };
        });
        return updated;
      });
    },
    [buildSTLEstimates, onFileAdded]
  );

  function handleMaterialChange(newMaterial: string) {
    setMaterialType(newMaterial);
    recalculateAllSTL(newMaterial, infillPercent, speedPreset);
  }

  function handleInfillChange(newInfill: number) {
    const clamped = Math.min(100, Math.max(5, newInfill));
    setInfillPercent(clamped);
    recalculateAllSTL(materialType, clamped, speedPreset);
  }

  function handleSpeedChange(newSpeed: SpeedPreset) {
    setSpeedPreset(newSpeed);
    recalculateAllSTL(materialType, infillPercent, newSpeed);
  }

  // Drag handlers
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
    if (e.dataTransfer.files?.length) {
      processFiles(e.dataTransfer.files);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) {
      processFiles(e.target.files);
    }
    // Reset input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const hasFiles = processedFiles.length > 0;
  const hasStlFiles = processedFiles.some((pf) => pf.estimates.type === "stl");

  return (
    <Card>
      <CardContent className={hasFiles ? "p-4 space-y-4" : "p-2"}>
        {/* Drop zone — always visible */}
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
          className={`relative flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
            hasFiles ? "gap-3 px-4 py-4" : "flex-col px-6 py-12"
          } ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/50"
          }`}
        >
          {hasFiles ? (
            <>
              <Upload
                className={`h-5 w-5 shrink-0 ${
                  dragActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Drop more files or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  STL or G-code &middot; multiple files supported
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-full bg-muted p-4">
                <Upload
                  className={`h-8 w-8 ${
                    dragActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </div>
              <p className="mt-4 text-sm font-medium text-foreground">
                Drop your files here
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                or click to browse &middot; multiple files supported
              </p>
              <p className="mt-4 text-xs text-muted-foreground/70">
                STL files for volume estimates &middot; G-code for slicer data
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            multiple
            onChange={handleFileInput}
            className="hidden"
            aria-label="Upload STL or G-code files"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3">
            <X className="h-4 w-4 shrink-0 text-destructive-foreground" />
            <p className="text-sm text-destructive-foreground">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto shrink-0"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Processing indicator */}
        {processingCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              Processing {processingCount} file{processingCount > 1 ? "s" : ""}...
            </span>
          </div>
        )}

        {/* File list */}
        {hasFiles && (
          <div className="space-y-1.5">
            {processedFiles.map((pf) => (
              <div
                key={pf.estimates.filename}
                className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {pf.estimates.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(pf.file.size)}
                    {pf.estimates.slicer && <> &middot; {pf.estimates.slicer}</>}
                  </p>
                </div>
                <Badge
                  variant={pf.estimates.type === "gcode" ? "success" : "info"}
                  className="shrink-0"
                >
                  {pf.estimates.type === "gcode" ? "G-code" : "STL"}
                </Badge>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Weight className="h-3 w-3" />
                    {pf.estimates.weightG.toFixed(1)}g
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(pf.estimates.printTimeMinutes)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(pf.estimates.filename)}
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${pf.estimates.filename}`}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* STL estimation controls — shown when any STL files exist */}
        {hasStlFiles && (
          <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card px-4 py-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              STL Estimation
            </span>
            <div className="w-36">
              <Select
                label="Material"
                options={materialOptions}
                value={materialType}
                onChange={(e) => handleMaterialChange(e.target.value)}
              />
            </div>
            <div className="w-24">
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
              <span className="text-sm font-medium text-foreground">Speed</span>
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
        )}
      </CardContent>
    </Card>
  );
}
