"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Package,
  Printer,
  Plus,
  Minus,
  History,
  QrCode,
  Loader2,
  CheckCircle2,
  XCircle,
  Unplug,
} from "lucide-react";
import type { ScannedMaterial } from "./scanner-modal";

interface ScanResultPanelProps {
  material: ScannedMaterial;
  onClose: () => void;
  onStockAdjust: (materialId: string, adjustment: number) => void;
  onViewHistory: (material: ScannedMaterial) => void;
  onRefresh: () => void;
}

interface PrinterOption {
  id: string;
  name: string;
}

function stockStatus(qty: number, threshold: number) {
  if (qty === 0) return { label: "Out of stock", variant: "destructive" as const };
  if (qty <= threshold) return { label: "Low stock", variant: "warning" as const };
  return { label: "In stock", variant: "success" as const };
}

export function ScanResultPanel({
  material,
  onClose,
  onStockAdjust,
  onViewHistory,
  onRefresh,
}: ScanResultPanelProps) {
  const [printers, setPrinters] = useState<PrinterOption[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadSuccess, setLoadSuccess] = useState<string | null>(null);
  const [unloading, setUnloading] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState(1);

  const status = stockStatus(material.stockQty, material.lowStockThreshold);
  const activeLoads = material.printerLoads ?? [];

  useEffect(() => {
    fetch("/api/printers")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPrinters(data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
        }
      })
      .catch(() => {});
  }, []);

  async function handleLoadPrinter() {
    if (!selectedPrinter) return;
    setLoading(true);
    try {
      const res = await fetch("/api/printer-loads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printerId: selectedPrinter, materialId: material.id }),
      });
      if (res.ok) {
        const printerName = printers.find((p) => p.id === selectedPrinter)?.name ?? "Printer";
        setLoadSuccess(`Loaded onto ${printerName}`);
        setSelectedPrinter("");
        onRefresh();
        setTimeout(() => setLoadSuccess(null), 3000);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleUnload(loadId: string) {
    setUnloading(loadId);
    try {
      await fetch("/api/printer-loads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: loadId }),
      });
      onRefresh();
    } catch {
      // ignore
    } finally {
      setUnloading(null);
    }
  }

  return (
    <Dialog open={true} onClose={onClose} maxWidth="max-w-md">
      <DialogHeader onClose={onClose}>
        <DialogTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Scan Result
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Material info */}
        <div className="flex items-start gap-3 rounded-lg border border-border p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">
                {material.materialType}
              </h3>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {[material.brand, material.colour].filter(Boolean).join(" — ") || "No brand/colour"}
            </p>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{material.stockQty} spool{material.stockQty !== 1 ? "s" : ""}</span>
              <span>${material.price.toFixed(2)}</span>
              <span>{material.spoolWeightG}g/spool</span>
            </div>
            {material.barcode && (
              <p className="mt-1 font-mono text-[10px] text-muted-foreground/60">
                {material.barcode}
              </p>
            )}
          </div>
        </div>

        {/* Currently loaded on printers */}
        {activeLoads.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Loaded on
            </p>
            <div className="space-y-1.5">
              {activeLoads.map((load) => (
                <div
                  key={load.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Printer className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{load.printer.name}</span>
                    <span className="text-xs text-muted-foreground">
                      since {new Date(load.loadedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnload(load.id)}
                    disabled={unloading === load.id}
                  >
                    {unloading === load.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Unplug className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1">Unload</span>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Quick Actions
          </p>

          {/* Load onto printer */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Select
                label="Assign to printer"
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                options={[
                  { value: "", label: "Select printer..." },
                  ...printers.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            </div>
            <Button
              onClick={handleLoadPrinter}
              disabled={!selectedPrinter || loading}
              className="shrink-0"
            >
              {loading ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Printer className="mr-1 h-4 w-4" />
              )}
              Load
            </Button>
          </div>

          {loadSuccess && (
            <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success-foreground">
              <CheckCircle2 className="h-4 w-4" />
              {loadSuccess}
            </div>
          )}

          {/* Stock adjust */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Stock:</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onStockAdjust(material.id, -adjustQty)}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <Input
              type="number"
              min="1"
              max="99"
              value={adjustQty}
              onChange={(e) => setAdjustQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 text-center"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onStockAdjust(material.id, adjustQty)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewHistory(material)}
            >
              <History className="h-3.5 w-3.5 mr-1" />
              History
            </Button>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Done
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
