import { roundCurrency } from "./utils";
import { currencySymbol } from "./currency";

/**
 * Format a number as a currency string.
 * Defaults to AUD when no currency code is provided.
 */
export function formatCurrency(value: number, currency?: string): string {
  const sym = currencySymbol(currency ?? "AUD");
  const rounded = roundCurrency(value);
  return `${sym}${rounded.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a date string to Australian dd/mm/yyyy (e.g. "25/02/2026").
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format a date string to Australian dd/mm/yyyy + time (e.g. "25/02/2026, 02:30 pm").
 */
export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a date string as relative time (e.g. "2m ago", "3h ago").
 */
export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return formatDate(dateStr);
}

// Re-export from single source of truth
export { tagColour } from "./status-colours";
