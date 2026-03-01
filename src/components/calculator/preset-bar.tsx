"use client";

import { useState } from "react";
import { type CalculatorInput } from "@/lib/calculator";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Save, FolderOpen, Trash2, Loader2 } from "lucide-react";

export interface CalculatorPreset {
  id: string;
  name: string;
  configJson: CalculatorInput;
  createdAt: string;
  updatedAt: string;
}

interface PresetBarProps {
  presets: CalculatorPreset[];
  selectedPresetId: string;
  onSelectPreset: (id: string) => void;
  onSavePreset: (name: string) => Promise<void>;
  onDeletePreset: (id: string) => Promise<void>;
  saving: boolean;
  deleting: boolean;
}

export function PresetBar({
  presets,
  selectedPresetId,
  onSelectPreset,
  onSavePreset,
  onDeletePreset,
  saving,
  deleting,
}: PresetBarProps) {
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [presetName, setPresetName] = useState("");

  async function handleSave() {
    const trimmed = presetName.trim();
    if (!trimmed) return;
    await onSavePreset(trimmed);
    setPresetName("");
    setShowSaveForm(false);
  }

  const presetOptions = [
    { value: "", label: "Load a preset..." },
    ...presets.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <div className="rounded-lg border border-border bg-card/50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="w-48">
          <Select
            options={presetOptions}
            value={selectedPresetId}
            onChange={(e) => onSelectPreset(e.target.value)}
          />
        </div>

        {selectedPresetId && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeletePreset(selectedPresetId)}
            disabled={deleting}
            title="Delete preset"
            className="h-8 w-8"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            )}
          </Button>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowSaveForm(!showSaveForm)}
        >
          <Save className="mr-1.5 h-3 w-3" />
          Save
        </Button>

        {showSaveForm && (
          <>
            <div className="h-4 w-px bg-border" />
            <input
              type="text"
              placeholder="Preset name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setShowSaveForm(false);
              }}
              className="flex h-8 w-40 rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !presetName.trim()}
              className="h-8"
            >
              {saving ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Save className="mr-1 h-3 w-3" />
              )}
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowSaveForm(false);
                setPresetName("");
              }}
              className="h-8"
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
