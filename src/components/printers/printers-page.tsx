"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { roundCurrency } from "@/lib/utils";
import { PRINTER_PRESETS } from "@/lib/presets";

// ---------- Types ----------

interface Printer {
  id: string;
  name: string;
  model: string | null;
  purchasePrice: number;
  lifetimeHours: number;
  powerWatts: number;
  bedSizeX: number | null;
  bedSizeY: number | null;
  bedSizeZ: number | null;
  currentHours: number;
  maintenanceCostPerHour: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PrinterFormData {
  name: string;
  model: string;
  purchasePrice: string;
  lifetimeHours: string;
  powerWatts: string;
  bedSizeX: string;
  bedSizeY: string;
  bedSizeZ: string;
  currentHours: string;
  maintenanceCostPerHour: string;
  notes: string;
}

const DEFAULT_ELECTRICITY_RATE = 0.3; // $/kWh

const emptyForm: PrinterFormData = {
  name: "",
  model: "",
  purchasePrice: "0",
  lifetimeHours: "5000",
  powerWatts: "200",
  bedSizeX: "",
  bedSizeY: "",
  bedSizeZ: "",
  currentHours: "0",
  maintenanceCostPerHour: "0.50",
  notes: "",
};

// ---------- Helpers ----------

function calcHourlyRate(printer: Printer): number {
  const depreciation = printer.purchasePrice / printer.lifetimeHours;
  const electricity = (printer.powerWatts / 1000) * DEFAULT_ELECTRICITY_RATE;
  return roundCurrency(depreciation + electricity + printer.maintenanceCostPerHour);
}

function printerToFormData(printer: Printer): PrinterFormData {
  return {
    name: printer.name,
    model: printer.model ?? "",
    purchasePrice: String(printer.purchasePrice),
    lifetimeHours: String(printer.lifetimeHours),
    powerWatts: String(printer.powerWatts),
    bedSizeX: printer.bedSizeX != null ? String(printer.bedSizeX) : "",
    bedSizeY: printer.bedSizeY != null ? String(printer.bedSizeY) : "",
    bedSizeZ: printer.bedSizeZ != null ? String(printer.bedSizeZ) : "",
    currentHours: String(printer.currentHours),
    maintenanceCostPerHour: String(printer.maintenanceCostPerHour),
    notes: printer.notes ?? "",
  };
}

function formDataToPayload(form: PrinterFormData) {
  return {
    name: form.name.trim(),
    model: form.model.trim() || null,
    purchasePrice: parseFloat(form.purchasePrice) || 0,
    lifetimeHours: parseFloat(form.lifetimeHours) || 5000,
    powerWatts: parseFloat(form.powerWatts) || 200,
    bedSizeX: form.bedSizeX ? parseFloat(form.bedSizeX) : null,
    bedSizeY: form.bedSizeY ? parseFloat(form.bedSizeY) : null,
    bedSizeZ: form.bedSizeZ ? parseFloat(form.bedSizeZ) : null,
    currentHours: parseFloat(form.currentHours) || 0,
    maintenanceCostPerHour: parseFloat(form.maintenanceCostPerHour) || 0.5,
    notes: form.notes.trim() || null,
  };
}

// ---------- Component ----------

export function PrintersPage() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PrinterFormData>(emptyForm);

  // Preset dropdown state
  const [presetOpen, setPresetOpen] = useState(false);
  const [presetLoading, setPresetLoading] = useState(false);
  const presetRef = useRef<HTMLDivElement>(null);

  // Close preset dropdown on outside click
  useEffect(() => {
    if (!presetOpen) return;
    function handleClick(e: MouseEvent) {
      if (presetRef.current && !presetRef.current.contains(e.target as Node)) {
        setPresetOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [presetOpen]);

  // --- Fetch printers ---

  const fetchPrinters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/printers");
      if (!res.ok) throw new Error("Failed to fetch printers");
      const data = await res.json();
      setPrinters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrinters();
  }, [fetchPrinters]);

  // --- Handlers ---

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(printer: Printer) {
    setEditingId(printer.id);
    setForm(printerToFormData(printer));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function updateField(field: keyof PrinterFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Printer name is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload = formDataToPayload(form);
      const url = editingId ? `/api/printers/${editingId}` : "/api/printers";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to ${editingId ? "update" : "create"} printer`);
      }

      closeModal();
      await fetchPrinters();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(printer: Printer) {
    if (!confirm(`Delete "${printer.name}"? This cannot be undone.`)) return;

    try {
      setError(null);
      const res = await fetch(`/api/printers/${printer.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        throw new Error("Failed to delete printer");
      }
      await fetchPrinters();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  // --- Preset handler ---

  async function handleAddFromPreset(presetIndex: number) {
    try {
      setPresetLoading(true);
      setError(null);
      const res = await fetch("/api/printers/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetIndex }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to create printer from preset");
      }

      setPresetOpen(false);
      await fetchPrinters();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPresetLoading(false);
    }
  }

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Your Printers</h2>
          <p className="text-sm text-muted-foreground">
            Manage your 3D printer profiles for cost calculations.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative" ref={presetRef}>
            <Button variant="secondary" onClick={() => setPresetOpen(!presetOpen)}>
              Add from Preset
            </Button>
            {presetOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-lg border border-border bg-card shadow-lg">
                <div className="max-h-80 overflow-y-auto p-1">
                  {PRINTER_PRESETS.map((preset, index) => (
                    <button
                      key={index}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted transition-colors disabled:opacity-50"
                      onClick={() => handleAddFromPreset(index)}
                      disabled={presetLoading}
                    >
                      <span className="font-medium">{preset.name}</span>
                      <span className="text-muted-foreground">${preset.purchasePrice}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Button onClick={openAdd}>Add Printer</Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <p className="text-sm text-muted-foreground">Loading printers...</p>
      )}

      {/* Empty state */}
      {!loading && printers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              No printers yet. Add your first printer to get started.
            </p>
            <Button onClick={openAdd}>Add Printer</Button>
          </CardContent>
        </Card>
      )}

      {/* Printer cards grid */}
      {!loading && printers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {printers.map((printer) => (
            <PrinterCard
              key={printer.id}
              printer={printer}
              onEdit={() => openEdit(printer)}
              onDelete={() => handleDelete(printer)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {modalOpen && (
        <PrinterModal
          title={editingId ? "Edit Printer" : "Add Printer"}
          form={form}
          saving={saving}
          onFieldChange={updateField}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// ---------- Printer Card ----------

function PrinterCard({
  printer,
  onEdit,
  onDelete,
}: {
  printer: Printer;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hourlyRate = calcHourlyRate(printer);
  const hoursPercent =
    printer.lifetimeHours > 0
      ? Math.min((printer.currentHours / printer.lifetimeHours) * 100, 100)
      : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{printer.name}</CardTitle>
            {printer.model && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {printer.model}
              </p>
            )}
          </div>
          <div className="ml-2 flex gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Hourly rate — prominent */}
        <div className="rounded-md bg-primary/10 px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground">Hourly Rate</p>
          <p className="text-lg font-bold text-primary">${hourlyRate.toFixed(2)}/hr</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-muted-foreground">Purchase Price</p>
            <p className="font-medium text-foreground">${roundCurrency(printer.purchasePrice).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Power</p>
            <p className="font-medium text-foreground">{printer.powerWatts}W</p>
          </div>
          <div>
            <p className="text-muted-foreground">Maintenance</p>
            <p className="font-medium text-foreground">${roundCurrency(printer.maintenanceCostPerHour).toFixed(2)}/hr</p>
          </div>
          {printer.bedSizeX != null && printer.bedSizeY != null && printer.bedSizeZ != null && (
            <div>
              <p className="text-muted-foreground">Bed Size</p>
              <p className="font-medium text-foreground">
                {printer.bedSizeX} x {printer.bedSizeY} x {printer.bedSizeZ}mm
              </p>
            </div>
          )}
        </div>

        {/* Hours progress bar */}
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Hours Used</span>
            <span>
              {printer.currentHours.toLocaleString()} / {printer.lifetimeHours.toLocaleString()} hrs
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${hoursPercent}%` }}
            />
          </div>
        </div>

        {/* Notes */}
        {printer.notes && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {printer.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Modal ----------

function PrinterModal({
  title,
  form,
  saving,
  onFieldChange,
  onSave,
  onClose,
}: {
  title: string;
  form: PrinterFormData;
  saving: boolean;
  onFieldChange: (field: keyof PrinterFormData, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  // Preview hourly rate in the form
  const previewRate = roundCurrency(
    (parseFloat(form.purchasePrice) || 0) / (parseFloat(form.lifetimeHours) || 5000) +
      ((parseFloat(form.powerWatts) || 0) / 1000) * DEFAULT_ELECTRICITY_RATE +
      (parseFloat(form.maintenanceCostPerHour) || 0)
  );

  return (
    <Dialog open={true} onClose={onClose}>
      <DialogHeader onClose={onClose}>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Name */}
        <Input
          label="Name *"
          value={form.name}
          onChange={(e) => onFieldChange("name", e.target.value)}
          placeholder="e.g. Bambu Lab X1 Carbon"
        />

        {/* Model */}
        <Input
          label="Model"
          value={form.model}
          onChange={(e) => onFieldChange("model", e.target.value)}
          placeholder="e.g. X1C"
        />

        {/* Purchase Price & Lifetime Hours */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Purchase Price ($)"
            type="number"
            min="0"
            step="0.01"
            value={form.purchasePrice}
            onChange={(e) => onFieldChange("purchasePrice", e.target.value)}
          />
          <Input
            label="Lifetime Hours"
            type="number"
            min="1"
            step="1"
            value={form.lifetimeHours}
            onChange={(e) => onFieldChange("lifetimeHours", e.target.value)}
          />
        </div>

        {/* Power Watts & Current Hours */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Power (Watts)"
            type="number"
            min="0"
            step="1"
            value={form.powerWatts}
            onChange={(e) => onFieldChange("powerWatts", e.target.value)}
          />
          <Input
            label="Current Hours"
            type="number"
            min="0"
            step="1"
            value={form.currentHours}
            onChange={(e) => onFieldChange("currentHours", e.target.value)}
          />
        </div>

        {/* Maintenance Cost */}
        <Input
          label="Maintenance Cost ($/hr)"
          type="number"
          min="0"
          step="0.01"
          value={form.maintenanceCostPerHour}
          onChange={(e) => onFieldChange("maintenanceCostPerHour", e.target.value)}
        />

        {/* Bed Size */}
        <div>
          <p className="mb-1 text-sm font-medium text-foreground">Bed Size (mm)</p>
          <div className="grid grid-cols-3 gap-3">
            <Input
              placeholder="X"
              type="number"
              min="0"
              value={form.bedSizeX}
              onChange={(e) => onFieldChange("bedSizeX", e.target.value)}
            />
            <Input
              placeholder="Y"
              type="number"
              min="0"
              value={form.bedSizeY}
              onChange={(e) => onFieldChange("bedSizeY", e.target.value)}
            />
            <Input
              placeholder="Z"
              type="number"
              min="0"
              value={form.bedSizeZ}
              onChange={(e) => onFieldChange("bedSizeZ", e.target.value)}
            />
          </div>
        </div>

        {/* Notes */}
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => onFieldChange("notes", e.target.value)}
          placeholder="Any additional notes about this printer..."
        />

        {/* Hourly rate preview */}
        <div className="rounded-md bg-primary/10 px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground">Calculated Hourly Rate</p>
          <p className="text-lg font-bold text-primary">${previewRate.toFixed(2)}/hr</p>
        </div>

        {/* Actions */}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save Printer"}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
