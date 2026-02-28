"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CloudUpload, Check, AlertTriangle, Loader2, X } from "lucide-react";

interface BackupEvent {
  type: "progress" | "error" | "complete";
  phase?: string;
  item?: string;
  current?: number;
  total?: number;
  message?: string;
  stats?: {
    dataFiles: number;
    quotePdfs: number;
    invoicePdfs: number;
    designFiles: number;
    jobPhotos: number;
    errors: number;
    startedAt: string;
    completedAt: string;
  };
}

const PHASE_LABELS: Record<string, string> = {
  data: "Exporting data",
  quotes: "Generating quote PDFs",
  invoices: "Generating invoice PDFs",
  designs: "Uploading design files",
  photos: "Uploading job photos",
};

export function MasterBackupButton() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const [phase, setPhase] = useState("");
  const [item, setItem] = useState("");
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [errors, setErrors] = useState<Array<{ phase: string; item: string; message: string }>>([]);
  const [stats, setStats] = useState<BackupEvent["stats"] | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setRunning(false);
    setComplete(false);
    setPhase("");
    setItem("");
    setCurrent(0);
    setTotal(0);
    setErrors([]);
    setStats(null);
    setFatalError(null);
    setShowErrors(false);
  }, []);

  const startBackup = useCallback(async () => {
    reset();
    setRunning(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/cloud/backup", {
        method: "POST",
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Backup failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const event: BackupEvent = JSON.parse(trimmed.slice(6));

            if (event.type === "progress") {
              setPhase(event.phase || "");
              setItem(event.item || "");
              setCurrent(event.current || 0);
              setTotal(event.total || 0);
            } else if (event.type === "error") {
              if (event.phase === "fatal") {
                setFatalError(event.message || "Backup failed");
                setRunning(false);
                return;
              }
              setErrors((prev) => [...prev, {
                phase: event.phase || "",
                item: event.item || "",
                message: event.message || "Unknown error",
              }]);
            } else if (event.type === "complete") {
              setStats(event.stats || null);
              setComplete(true);
              setRunning(false);
            }
          } catch {
            // Skip malformed SSE events
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setFatalError(err instanceof Error ? err.message : "Backup failed");
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [reset]);

  function handleClose() {
    if (running && abortRef.current) {
      abortRef.current.abort();
    }
    setOpen(false);
    reset();
  }

  function handleStart() {
    setOpen(true);
    startBackup();
  }

  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <>
      <Button onClick={handleStart} variant="secondary" disabled={running}>
        <CloudUpload className="mr-2 h-4 w-4" />
        Backup to OneDrive
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {complete ? (
              <><Check className="h-5 w-5 text-emerald-500" /> Backup Complete</>
            ) : fatalError ? (
              <><X className="h-5 w-5 text-destructive" /> Backup Failed</>
            ) : (
              <><CloudUpload className="h-5 w-5" /> Backing Up</>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Fatal error */}
          {fatalError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {fatalError}
            </div>
          )}

          {/* Progress */}
          {running && (
            <>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">
                    {PHASE_LABELS[phase] || phase || "Preparing..."}
                  </span>
                  <span className="text-muted-foreground">
                    {total > 0 ? `${current} / ${total}` : ""}
                  </span>
                </div>
                {item && (
                  <p className="text-xs text-muted-foreground truncate">{item}</p>
                )}
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </>
          )}

          {/* Complete summary */}
          {complete && stats && (
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
                <p className="font-medium text-emerald-700 dark:text-emerald-400">
                  All data backed up to OneDrive successfully.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">Data files</p>
                  <p className="font-medium">{stats.dataFiles}</p>
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">Quote PDFs</p>
                  <p className="font-medium">{stats.quotePdfs}</p>
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">Invoice PDFs</p>
                  <p className="font-medium">{stats.invoicePdfs}</p>
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">Design files</p>
                  <p className="font-medium">{stats.designFiles}</p>
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">Job photos</p>
                  <p className="font-medium">{stats.jobPhotos}</p>
                </div>
                {stats.errors > 0 && (
                  <div className="rounded-md bg-amber-500/10 p-2">
                    <p className="text-xs text-amber-600 dark:text-amber-400">Errors</p>
                    <p className="font-medium text-amber-600 dark:text-amber-400">{stats.errors}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inline errors */}
          {errors.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setShowErrors((p) => !p)}
                className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {errors.length} warning{errors.length !== 1 ? "s" : ""} — {showErrors ? "hide" : "show"}
              </button>
              {showErrors && (
                <div className="max-h-40 overflow-y-auto rounded border border-amber-500/30 bg-amber-500/5 p-2 text-xs space-y-1">
                  {errors.map((e, i) => (
                    <div key={i} className="text-amber-700 dark:text-amber-300">
                      <span className="font-medium">[{e.phase}]</span> {e.item}: {e.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {(complete || fatalError) && (
            <div className="flex justify-end pt-2">
              <Button onClick={handleClose} variant="secondary" size="sm">
                Close
              </Button>
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
