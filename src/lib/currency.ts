import { roundCurrency } from "./utils";

export const SUPPORTED_CURRENCIES = ["AUD", "USD", "EUR", "GBP"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

const SYMBOLS: Record<CurrencyCode, string> = {
  AUD: "$",
  USD: "$",
  EUR: "\u20AC",
  GBP: "\u00A3",
};

export function currencySymbol(code: string): string {
  return SYMBOLS[code as CurrencyCode] ?? "$";
}

export function formatMoney(
  value: number,
  currency: string = "AUD"
): string {
  const sym = currencySymbol(currency);
  const rounded = roundCurrency(value);
  return `${sym}${rounded.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
