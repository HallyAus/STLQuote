import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Round to 2 decimal places (for currency) */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
