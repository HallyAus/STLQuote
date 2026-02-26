"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  disabled?: boolean;
}

interface BulkActionBarProps {
  count: number;
  actions: BulkAction[];
  onClear: () => void;
}

export function BulkActionBar({ count, actions, onClear }: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-lg border border-border bg-popover px-4 py-3 shadow-xl">
      <span className="text-sm font-medium whitespace-nowrap">
        {count} selected
      </span>
      <div className="h-5 w-px bg-border" />
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant ?? "secondary"}
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </div>
      <button
        onClick={onClear}
        className="ml-1 rounded-md p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
