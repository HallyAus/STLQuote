"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Folder,
  FileText,
  Image as ImageIcon,
  Box,
  ChevronRight,
  ArrowLeft,
  HardDrive,
  Cloud,
  Download,
  Check,
} from "lucide-react";

interface CloudFile {
  id: string;
  name: string;
  isFolder: boolean;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
}

interface CloudFilePickerProps {
  designId: string;
  onImport: () => void;
  onClose: () => void;
}

type Provider = "google_drive" | "onedrive";

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name: string, isFolder: boolean) {
  if (isFolder) return Folder;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const imageExts = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"]);
  const cadExts = new Set(["stl", "3mf", "step", "stp", "obj", "gcode"]);
  if (imageExts.has(ext)) return ImageIcon;
  if (cadExts.has(ext)) return Box;
  return FileText;
}

export function CloudFilePicker({ designId, onImport, onClose }: CloudFilePickerProps) {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [connections, setConnections] = useState<Record<string, { connected: boolean }>>({});
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<Set<string>>(new Set());
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: "Root" }]);
  const [error, setError] = useState<string | null>(null);

  // Fetch connection status
  useEffect(() => {
    async function fetchConnections() {
      try {
        const res = await fetch("/api/cloud/status");
        if (res.ok) {
          const data = await res.json();
          setConnections({
            google_drive: data.google_drive,
            onedrive: data.onedrive,
          });
          // Auto-select if only one connected
          const gConnected = data.google_drive?.connected;
          const oConnected = data.onedrive?.connected;
          if (gConnected && !oConnected) setProvider("google_drive");
          else if (!gConnected && oConnected) setProvider("onedrive");
        }
      } catch {} finally {
        setLoading(false);
      }
    }
    fetchConnections();
  }, []);

  const currentFolderId = breadcrumbs[breadcrumbs.length - 1]?.id;

  const fetchFiles = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ provider });
      if (currentFolderId) params.set("folderId", currentFolderId);

      const res = await fetch(`/api/cloud/browse?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to load files");
      }
      const data = await res.json();
      setFiles(data.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [provider, currentFolderId]);

  useEffect(() => {
    if (provider) fetchFiles();
  }, [provider, fetchFiles]);

  function navigateToFolder(file: CloudFile) {
    setBreadcrumbs((prev) => [...prev, { id: file.id, name: file.name }]);
  }

  function navigateToBreadcrumb(index: number) {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  }

  async function handleImport(file: CloudFile) {
    if (!provider) return;
    setImporting((prev) => new Set(prev).add(file.id));
    try {
      const res = await fetch("/api/cloud/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          cloudFileId: file.id,
          cloudFileName: file.name,
          designId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Import failed");
      }
      setImported((prev) => new Set(prev).add(file.id));
      onImport();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import file");
    } finally {
      setImporting((prev) => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
    }
  }

  const hasConnections = connections.google_drive?.connected || connections.onedrive?.connected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-2xl mx-4 bg-background rounded-xl border border-border shadow-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold">Import from Cloud</h3>
          <button onClick={onClose} className="rounded p-1.5 hover:bg-muted text-muted-foreground">
            <span className="sr-only">Close</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Provider tabs */}
        {!loading && hasConnections && (
          <div className="flex gap-2 p-3 border-b border-border">
            {connections.google_drive?.connected && (
              <button
                onClick={() => { setProvider("google_drive"); setBreadcrumbs([{ id: null, name: "Root" }]); }}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  provider === "google_drive" ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
                )}
              >
                <HardDrive className="h-4 w-4" />
                Google Drive
              </button>
            )}
            {connections.onedrive?.connected && (
              <button
                onClick={() => { setProvider("onedrive"); setBreadcrumbs([{ id: null, name: "Root" }]); }}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  provider === "onedrive" ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
                )}
              >
                <Cloud className="h-4 w-4" />
                OneDrive
              </button>
            )}
          </div>
        )}

        {/* Breadcrumbs */}
        {provider && breadcrumbs.length > 1 && (
          <div className="flex items-center gap-1 px-4 py-2 text-sm text-muted-foreground border-b border-border overflow-x-auto">
            <button
              onClick={() => navigateToBreadcrumb(0)}
              className="hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1 shrink-0">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                <button
                  onClick={() => navigateToBreadcrumb(i)}
                  className={cn(
                    "hover:text-foreground transition-colors",
                    i === breadcrumbs.length - 1 && "text-foreground font-medium"
                  )}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive-foreground mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !hasConnections ? (
            <div className="text-center py-12 space-y-3">
              <Cloud className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No cloud storage connected. Go to Integrations to connect Google Drive or OneDrive.
              </p>
              <a href="/integrations" className="text-sm text-primary hover:underline">
                Go to Integrations
              </a>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">This folder is empty</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border divide-y divide-border">
              {files.map((file) => {
                const Icon = getFileIcon(file.name, file.isFolder);
                const isImporting = importing.has(file.id);
                const isImported = imported.has(file.id);

                return (
                  <div
                    key={file.id}
                    className={cn(
                      "flex items-center gap-3 p-3 transition-colors",
                      file.isFolder && "cursor-pointer hover:bg-muted/50"
                    )}
                    onClick={file.isFolder ? () => navigateToFolder(file) : undefined}
                  >
                    <Icon className={cn(
                      "h-5 w-5 shrink-0",
                      file.isFolder ? "text-primary/70" : "text-muted-foreground"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      {file.size && <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>}
                    </div>
                    {file.isFolder ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : isImported ? (
                      <Badge variant="success" size="sm" className="shrink-0">
                        <Check className="h-3 w-3 mr-1" />Imported
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isImporting}
                        onClick={(e) => { e.stopPropagation(); handleImport(file); }}
                        className="shrink-0"
                      >
                        {isImporting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <><Download className="h-3.5 w-3.5 mr-1" />Import</>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
