import { roundCurrency } from "./utils";

/**
 * Format a number as AUD currency string.
 * Handles both raw decimals and already-rounded values.
 */
export function formatCurrency(value: number): string {
  const rounded = roundCurrency(value);
  return `$${rounded.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a date string to short Australian format (e.g. "25 Feb 2026").
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format a date string to Australian date + time (e.g. "25 Feb 2026, 02:30 pm").
 */
export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Return Tailwind colour classes for a client tag.
 */
export function tagColour(tag: string): string {
  const lower = tag.toLowerCase();
  if (lower === "tradie") return "bg-orange-500/15 text-orange-600 dark:text-orange-400";
  if (lower === "ev owner") return "bg-green-500/15 text-green-600 dark:text-green-400";
  if (lower === "maker") return "bg-blue-500/15 text-blue-600 dark:text-blue-400";
  if (lower === "commercial") return "bg-purple-500/15 text-purple-600 dark:text-purple-400";
  return "bg-gray-500/15 text-gray-600 dark:text-gray-400";
}
