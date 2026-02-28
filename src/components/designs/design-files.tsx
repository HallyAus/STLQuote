"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Upload,
  Trash2,
  Loader2,
  Star,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Box,
  X,
  Cloud,
} from "lucide-react";
import { CloudFilePicker } from "@/components/cloud/cloud-file-picker";

interface DesignFile {
  id: string;
  fileType: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string;
}

interface DesignFilesProps {
  designId: string;
  userId: string;
  filter: "reference_image" | "cad";
  onUpdate: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getTypeIcon(fileType: string) {
  if (fileType === "reference_image") return ImageIcon;
  if (["stl", "3mf", "step", "obj", "gcode"].includes(fileType)) return Box;
  return FileText;
}

const TYPE_LABELS: Record<string, string> = {
  reference_image: "Image",
  stl: "STL",
  "3mf": "3MF",
  step: "STEP",
  obj: "OBJ",
  gcode: "G-code",
  document: "Document",
  other: "Other",
};

export function DesignFiles({ designId, filter, onUpdate }: DesignFilesProps) {
  const [files, setFiles] = useState<DesignFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showCloudPicker, setShowCloudPicker] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<Record<string, unknown> | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isImageFilter = filter === "reference_image";

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/designs/${designId}/files`);
      if (res.ok) {
        const all: DesignFile[] = await res.json();
        if (isImageFilter) {
          setFiles(all.filter((f) => f.fileType === "reference_image"));
        } else {
          setFiles(all.filter((f) => f.fileType !== "reference_image"));
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [designId, isImageFilter]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  async function handleUpload(fileList: FileList) {
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);
        if (isImageFilter && files.length === 0) {
          formData.append("isPrimary", "true");
        }
        await fetch(`/api/designs/${designId}/files`, { method: "POST", body: formData });
      }
      await fetchFiles();
      onUpdate();
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(fileId: string) {
    setDeleting(fileId);
    try {
      const res = await fetch(`/api/designs/${designId}/files/${fileId}`, { method: "DELETE" });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        onUpdate();
      }
    } finally {
      setDeleting(null);
    }
  }

  async function setPrimary(fileId: string) {
    await fetch(`/api/designs/${designId}/files/${fileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrimary: true }),
    });
    setFiles((prev) => prev.map((f) => ({ ...f, isPrimary: f.id === fileId })));
    onUpdate();
  }

  async function analyzeImage(file: DesignFile) {
    setAnalyzing(file.id);
    try {
      // Fetch the image as base64
      const imgRes = await fetch(`/api/designs/${designId}/files`);
      const allFiles: DesignFile[] = await imgRes.json();
      const target = allFiles.find((f) => f.id === file.id);
      if (!target) return;

      // We need to read the image — fetch from disk via a temporary approach
      // Actually, use the filename to construct a fetch to the file
      // For now, convert from the stored thumbnail or just send filename reference
      // We'll read the file via canvas if it's displayed
      const img = document.createElement("img");
      img.crossOrigin = "anonymous";
      img.src = `/api/designs/${designId}/files/${file.id}/serve`;

      // Alternative: use the file upload data from the DOM if available
      // For simplicity, we'll prompt user to use the reference analyzer from overview
      setAnalysisResult(null);

      // Try to use a canvas to get base64
      const canvas = document.createElement("canvas");
      await new Promise<void>((resolve) => {
        img.onload = () => {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d")?.drawImage(img, 0, 0);
          resolve();
        };
        img.onerror = () => resolve();
      });

      let imageData: string;
      try {
        imageData = canvas.toDataURL("image/jpeg", 0.8);
      } catch {
        alert("Unable to read image for analysis. Try uploading through the AI Brainstorm tab instead.");
        return;
      }

      const res = await fetch(`/api/designs/${designId}/ai/analyze-reference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData }),
      });

      if (res.ok) {
        const result = await res.json();
        setAnalysisResult(result);
      } else {
        const err = await res.json().catch(() => ({ error: "Analysis failed" }));
        alert(err.error);
      }
    } finally {
      setAnalyzing(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border",
          uploading && "opacity-50 pointer-events-none"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={isImageFilter ? "image/*" : ".stl,.3mf,.step,.stp,.obj,.gcode,.pdf,.doc,.docx,.txt"}
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
          className="hidden"
        />
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
        )}
        <p className="text-sm text-muted-foreground">
          {uploading ? "Uploading..." : "Drag files here or"}
        </p>
        {!uploading && (
          <div className="flex gap-2 mt-2">
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              Choose Files
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCloudPicker(true)}>
              <Cloud className="h-3.5 w-3.5 mr-1.5" />
              Import from Cloud
            </Button>
          </div>
        )}
      </div>

      {/* Files grid/list */}
      {isImageFilter ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {files.map((f) => (
            <div key={f.id} className="group relative rounded-lg border border-border overflow-hidden">
              <div
                className="aspect-square bg-muted flex items-center justify-center cursor-pointer"
                onClick={() => setLightbox(f.filename)}
              >
                <img
                  src={`/api/designs/${designId}/files/${f.id}/serve`}
                  alt={f.originalName}
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <div className="p-2 space-y-1">
                <p className="text-xs font-medium truncate">{f.originalName}</p>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{formatSize(f.sizeBytes)}</span>
                  {f.isPrimary && <Badge size="sm" variant="success">Primary</Badge>}
                </div>
              </div>
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!f.isPrimary && (
                  <button onClick={() => setPrimary(f.id)} className="rounded bg-background/80 p-1 hover:bg-background" title="Set as primary">
                    <Star className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => analyzeImage(f)}
                  disabled={analyzing === f.id}
                  className="rounded bg-background/80 p-1 hover:bg-background"
                  title="Analyse with AI"
                >
                  {analyzing === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => handleDelete(f.id)}
                  disabled={deleting === f.id}
                  className="rounded bg-background/80 p-1 hover:bg-background text-destructive-foreground"
                  title="Delete"
                >
                  {deleting === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border">
          {files.map((f) => {
            const Icon = getTypeIcon(f.fileType);
            return (
              <div key={f.id} className="flex items-center gap-3 p-3">
                <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.originalName}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(f.sizeBytes)}</p>
                </div>
                <Badge size="sm">{TYPE_LABELS[f.fileType] || f.fileType}</Badge>
                <button
                  onClick={() => handleDelete(f.id)}
                  disabled={deleting === f.id}
                  className="rounded p-1.5 hover:bg-muted text-muted-foreground hover:text-destructive-foreground transition-colors"
                >
                  {deleting === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            );
          })}
          {files.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No {isImageFilter ? "reference images" : "files"} yet. Upload some above.
            </div>
          )}
        </div>
      )}

      {/* Analysis result */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">AI Analysis Result</CardTitle>
              <button onClick={() => setAnalysisResult(null)} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {typeof analysisResult.description === "string" && <p>{analysisResult.description}</p>}
            {typeof analysisResult.replicationStrategy === "string" && (
              <div><p className="font-medium text-muted-foreground mb-1">Replication Strategy</p><p>{analysisResult.replicationStrategy}</p></div>
            )}
            {typeof analysisResult.suggestedMaterial === "string" && (
              <div><p className="font-medium text-muted-foreground mb-1">Suggested Material</p><p>{analysisResult.suggestedMaterial}</p></div>
            )}
            {Array.isArray(analysisResult.challenges) && (
              <div>
                <p className="font-medium text-muted-foreground mb-1">Challenges</p>
                <ul className="list-disc list-inside space-y-0.5">{(analysisResult.challenges as string[]).map((c, i) => <li key={i}>{c}</li>)}</ul>
              </div>
            )}
            {typeof analysisResult.feasibilityScore === "number" && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Feasibility:</span>
                <span className="font-bold">{analysisResult.feasibilityScore}/10</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightbox(null)}>
            <X className="h-6 w-6" />
          </button>
          <img
            src={`/api/designs/${designId}/files/${files.find((f) => f.filename === lightbox)?.id}/serve`}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
        </div>
      )}

      {/* Cloud file picker */}
      {showCloudPicker && (
        <CloudFilePicker
          designId={designId}
          onImport={() => { fetchFiles(); onUpdate(); }}
          onClose={() => setShowCloudPicker(false)}
        />
      )}
    </div>
  );
}