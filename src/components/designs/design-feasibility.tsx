"use client";

export function DesignFeasibility({
  score,
  notes,
  cost,
  timeMin,
}: {
  score: number;
  notes: string | null;
  cost: number | null;
  timeMin: number | null;
}) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium">Feasibility Score</span>
          <span className="font-bold tabular-nums">{score}/10</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              score >= 7 ? "bg-success" : score >= 4 ? "bg-warning" : "bg-destructive"
            }`}
            style={{ width: `${(score / 10) * 100}%` }}
          />
        </div>
      </div>

      {notes && (
        <p className="text-muted-foreground">{notes}</p>
      )}

      {(cost || timeMin) && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
          {cost && (
            <div>
              <p className="text-xs text-muted-foreground">Est. Cost</p>
              <p className="font-medium">${cost.toFixed(2)}</p>
            </div>
          )}
          {timeMin && (
            <div>
              <p className="text-xs text-muted-foreground">Est. Print Time</p>
              <p className="font-medium">{timeMin >= 60 ? `${(timeMin / 60).toFixed(1)}h` : `${Math.round(timeMin)}min`}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
