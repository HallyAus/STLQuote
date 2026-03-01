"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X, Loader2, AlertCircle, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScanResult: (material: ScannedMaterial) => void;
}

export interface ScannedMaterial {
  id: string;
  materialType: string;
  brand: string | null;
  colour: string | null;
  spoolWeightG: number;
  price: number;
  stockQty: number;
  lowStockThreshold: number;
  barcode: string | null;
  printerLoads?: {
    id: string;
    printer: { id: string; name: string };
    loadedAt: string;
  }[];
}

type ScanState = "initialising" | "scanning" | "processing" | "error" | "not-found";

export function ScannerModal({ open, onClose, onScanResult }: ScannerModalProps) {
  const [state, setState] = useState<ScanState>("initialising");
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  const cleanup = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        // State 2 = SCANNING
        if (state === 2) {
          await scannerRef.current.stop();
        }
      } catch {
        // ignore cleanup errors
      }
      scannerRef.current = null;
    }
  }, []);

  const handleScan = useCallback(async (code: string) => {
    if (!mountedRef.current) return;
    setState("processing");

    try {
      const res = await fetch("/api/materials/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!mountedRef.current) return;

      if (res.status === 404) {
        setState("not-found");
        setError(`No material found for code: ${code}`);
        // Resume scanning after 2 seconds
        setTimeout(() => {
          if (mountedRef.current) setState("scanning");
        }, 2000);
        return;
      }

      if (!res.ok) {
        setState("error");
        setError("Scan lookup failed");
        return;
      }

      const material = await res.json();
      await cleanup();
      onScanResult(material);
    } catch {
      if (mountedRef.current) {
        setState("error");
        setError("Network error during scan");
      }
    }
  }, [cleanup, onScanResult]);

  useEffect(() => {
    mountedRef.current = true;
    if (!open) return;

    let cancelled = false;

    const startScanner = async () => {
      // Wait for DOM to be ready
      await new Promise((r) => setTimeout(r, 300));
      if (cancelled || !mountedRef.current) return;

      const containerId = "qr-scanner-container";
      const el = document.getElementById(containerId);
      if (!el) return;

      try {
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (!cancelled) handleScan(decodedText);
          },
          () => {
            // QR code not detected — ignore
          }
        );

        if (!cancelled && mountedRef.current) {
          setState("scanning");
        }
      } catch (err) {
        if (!cancelled && mountedRef.current) {
          setState("error");
          setError(
            err instanceof Error && err.message.includes("permission")
              ? "Camera permission denied. Please allow camera access."
              : "Failed to start camera. Make sure no other app is using it."
          );
        }
      }
    };

    setState("initialising");
    setError("");
    startScanner();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      cleanup();
    };
  }, [open, cleanup, handleScan]);

  if (!open) return null;

  return (
    <Dialog open={true} onClose={onClose} maxWidth="max-w-md">
      <DialogHeader onClose={onClose}>
        <DialogTitle className="flex items-center gap-2">
          <ScanLine className="h-5 w-5" />
          Scan Spool
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Camera viewport */}
        <div
          ref={containerRef}
          className="relative mx-auto overflow-hidden rounded-xl bg-black"
          style={{ minHeight: 280 }}
        >
          <div id="qr-scanner-container" className="w-full" />

          {/* Overlay states */}
          {state === "initialising" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <p className="mt-2 text-sm text-white/70">Starting camera...</p>
            </div>
          )}

          {state === "processing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-sm text-white/70">Looking up material...</p>
            </div>
          )}

          {state === "not-found" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
              <AlertCircle className="h-8 w-8 text-warning-foreground" />
              <p className="mt-2 text-sm text-white/70">{error}</p>
              <p className="text-xs text-white/50">Resuming scan...</p>
            </div>
          )}
        </div>

        {/* Error state */}
        {state === "error" && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 text-destructive-foreground" />
              <div>
                <p className="text-sm font-medium text-destructive-foreground">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setState("initialising");
                    setError("");
                    // Re-trigger by toggling a ref (the effect depends on `open`)
                  }}
                >
                  Try again
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {state === "scanning" && (
          <p className="text-center text-xs text-muted-foreground">
            Point your camera at a QR code or barcode on the spool
          </p>
        )}

        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
