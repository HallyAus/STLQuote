/**
 * Shared status colour definitions — single source of truth.
 * All colours use theme CSS custom properties that auto-flip between light/dark.
 */

// ---------------------------------------------------------------------------
// Banner classes (error, success, warning, info alerts)
// ---------------------------------------------------------------------------

export const BANNER = {
  error:
    "rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground",
  success:
    "rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success-foreground",
  warning:
    "rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground",
  info:
    "rounded-md border border-info/30 bg-info/10 p-3 text-sm text-info-foreground",
} as const;

// ---------------------------------------------------------------------------
// Inline status text colours (for stock health numbers, etc.)
// ---------------------------------------------------------------------------

export const STATUS_TEXT = {
  danger: "text-destructive-foreground",
  warning: "text-warning-foreground",
  success: "text-success-foreground",
  info: "text-info-foreground",
} as const;

// ---------------------------------------------------------------------------
// Quote status
// ---------------------------------------------------------------------------

export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export const QUOTE_STATUS: Record<
  QuoteStatus,
  {
    label: string;
    variant: "default" | "info" | "success" | "destructive" | "warning";
    barColour: string;
  }
> = {
  DRAFT:    { label: "Draft",    variant: "default",     barColour: "bg-muted-foreground" },
  SENT:     { label: "Sent",     variant: "info",        barColour: "bg-info" },
  ACCEPTED: { label: "Accepted", variant: "success",     barColour: "bg-success" },
  REJECTED: { label: "Rejected", variant: "destructive", barColour: "bg-destructive" },
  EXPIRED:  { label: "Expired",  variant: "warning",     barColour: "bg-warning" },
};

// ---------------------------------------------------------------------------
// Job status
// ---------------------------------------------------------------------------

export type JobStatus =
  | "QUEUED"
  | "PRINTING"
  | "POST_PROCESSING"
  | "QUALITY_CHECK"
  | "PACKING"
  | "SHIPPED"
  | "COMPLETE";

export const JOB_STATUS: Record<
  JobStatus,
  {
    label: string;
    variant: "default" | "info" | "success" | "warning";
    dotColour: string;
  }
> = {
  QUEUED:          { label: "Queued",          variant: "default", dotColour: "bg-muted-foreground" },
  PRINTING:        { label: "Printing",        variant: "info",    dotColour: "bg-info" },
  POST_PROCESSING: { label: "Post-Processing", variant: "warning", dotColour: "bg-warning" },
  QUALITY_CHECK:   { label: "Quality Check",   variant: "info",    dotColour: "bg-info" },
  PACKING:         { label: "Packing",         variant: "warning", dotColour: "bg-warning" },
  SHIPPED:         { label: "Shipped",         variant: "success", dotColour: "bg-success" },
  COMPLETE:        { label: "Complete",        variant: "success", dotColour: "bg-success" },
};

export const JOB_STATUS_ORDER: JobStatus[] = [
  "QUEUED",
  "PRINTING",
  "POST_PROCESSING",
  "QUALITY_CHECK",
  "PACKING",
  "SHIPPED",
  "COMPLETE",
];

// ---------------------------------------------------------------------------
// Client tag colours — theme-aware
// ---------------------------------------------------------------------------

export function tagColour(tag: string): string {
  const lower = tag.toLowerCase();
  if (lower === "tradie")     return "bg-warning/15 text-warning-foreground";
  if (lower === "ev owner")   return "bg-success/15 text-success-foreground";
  if (lower === "maker")      return "bg-info/15 text-info-foreground";
  if (lower === "commercial") return "bg-primary/15 text-primary";
  return "bg-muted text-muted-foreground";
}
