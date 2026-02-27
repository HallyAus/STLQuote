"use client";

import { Card, CardContent } from "@/components/ui/card";

interface DesignBriefProps {
  data: Record<string, unknown>;
}

export function DesignBrief({ data }: DesignBriefProps) {
  const dims = data.dimensions as Record<string, number | null> | undefined;
  const mat = data.material as Record<string, string | null> | undefined;
  const printSettings = data.printSettings as Record<string, unknown> | undefined;
  const feasibility = data.feasibility as Record<string, unknown> | undefined;
  const costEstimate = data.costEstimate as Record<string, unknown> | undefined;

  return (
    <div className="space-y-4 text-sm">
      {typeof data.summary === "string" && (
        <p className="text-muted-foreground">{data.summary}</p>
      )}

      {dims && (dims.lengthMm || dims.widthMm || dims.heightMm) && (
        <div>
          <p className="font-medium mb-1">Dimensions</p>
          <p className="text-muted-foreground">
            {dims.lengthMm ?? "?"}L × {dims.widthMm ?? "?"}W × {dims.heightMm ?? "?"}H mm
            {dims.weightG ? ` — ${dims.weightG}g` : ""}
          </p>
        </div>
      )}

      {mat && mat.type && (
        <div>
          <p className="font-medium mb-1">Material</p>
          <p className="text-muted-foreground">
            {mat.type}{mat.colour ? ` (${mat.colour})` : ""}
          </p>
          {mat.reason && <p className="text-xs text-muted-foreground mt-0.5">{mat.reason}</p>}
        </div>
      )}

      {printSettings && (
        <div>
          <p className="font-medium mb-1">Print Settings</p>
          <div className="grid grid-cols-2 gap-1 text-muted-foreground">
            {typeof printSettings.infillPercent === "number" && <p>Infill: {printSettings.infillPercent}%</p>}
            {typeof printSettings.layerHeightMm === "number" && <p>Layer: {printSettings.layerHeightMm}mm</p>}
            {typeof printSettings.orientation === "string" && <p>Orientation: {printSettings.orientation}</p>}
            {typeof printSettings.supportsNeeded === "boolean" && <p>Supports: {printSettings.supportsNeeded ? "Yes" : "No"}</p>}
          </div>
          {typeof printSettings.notes === "string" && <p className="text-xs text-muted-foreground mt-1">{printSettings.notes}</p>}
        </div>
      )}

      {feasibility && typeof feasibility.score === "number" && (
        <div>
          <p className="font-medium mb-1">Feasibility</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  (feasibility.score as number) >= 7 ? "bg-success" : (feasibility.score as number) >= 4 ? "bg-warning" : "bg-destructive"
                }`}
                style={{ width: `${((feasibility.score as number) / 10) * 100}%` }}
              />
            </div>
            <span className="font-bold tabular-nums">{feasibility.score}/10</span>
          </div>
          {typeof feasibility.printability === "string" && <p className="text-muted-foreground">{feasibility.printability}</p>}
          {Array.isArray(feasibility.challenges) && feasibility.challenges.length > 0 && (
            <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-0.5">
              {(feasibility.challenges as string[]).map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}
        </div>
      )}

      {costEstimate && (
        <div>
          <p className="font-medium mb-1">Cost Estimate</p>
          <div className="grid grid-cols-2 gap-1 text-muted-foreground">
            {typeof costEstimate.materialCostAud === "number" && <p>Material: ${(costEstimate.materialCostAud as number).toFixed(2)}</p>}
            {typeof costEstimate.printTimeMinutes === "number" && (
              <p>Print time: {(costEstimate.printTimeMinutes as number) >= 60 ? `${((costEstimate.printTimeMinutes as number) / 60).toFixed(1)}h` : `${Math.round(costEstimate.printTimeMinutes as number)}min`}</p>
            )}
            {typeof costEstimate.totalCostAud === "number" && (
              <p className="font-medium text-foreground col-span-2">Total: ${(costEstimate.totalCostAud as number).toFixed(2)} AUD</p>
            )}
          </div>
          {typeof costEstimate.breakdown === "string" && <p className="text-xs text-muted-foreground mt-1">{costEstimate.breakdown}</p>}
        </div>
      )}
    </div>
  );
}
