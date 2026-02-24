"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { roundCurrency } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LineItem {
  id: string;
  description: string;
  printWeightG: number;
  printTimeMinutes: number;
  materialCost: number;
  machineCost: number;
  labourCost: number;
  overheadCost: number;
  lineTotal: number;
  quantity: number;
  notes: string | null;
}

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
}

interface Quote {
  id: string;
  quoteNumber: string;
  status: string;
  subtotal: number;
  markupPct: number;
  total: number;
  currency: string;
  notes: string | null;
  terms: string | null;
  expiryDate: string | null;
  createdAt: string;
  updatedAt: string;
  client: Client | null;
  lineItems: LineItem[];
}

interface Settings {
  businessName: string | null;
  businessAddress: string | null;
  businessAbn: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  businessLogoUrl: string | null;
  quoteTermsText: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number): string {
  return `$${roundCurrency(value).toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuotePdf() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [quoteRes, settingsRes] = await Promise.all([
          fetch(`/api/quotes/${quoteId}`),
          fetch("/api/settings"),
        ]);

        if (!quoteRes.ok) throw new Error("Failed to fetch quote");
        if (!settingsRes.ok) throw new Error("Failed to fetch settings");

        const quoteData: Quote = await quoteRes.json();
        const settingsData: Settings = await settingsRes.json();

        setQuote(quoteData);
        setSettings(settingsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [quoteId]);

  // ---- Loading ----
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ---- Error ----
  if (error || !quote) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">{error ?? "Quote not found."}</p>
        <button
          onClick={() => router.push(`/quotes/${quoteId}`)}
          className="text-sm text-blue-600 underline hover:text-blue-800"
        >
          Back to Quote
        </button>
      </div>
    );
  }

  // ---- Calculations ----
  const subtotal = roundCurrency(
    quote.lineItems.reduce(
      (sum, item) => sum + item.lineTotal * item.quantity,
      0
    )
  );
  const total = roundCurrency(subtotal * (1 + quote.markupPct / 100));

  const client = quote.client;
  const biz = settings;

  // Terms: use quote-level terms first, fall back to global settings
  const termsText = quote.terms || biz?.quoteTermsText || null;

  return (
    <>
      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          /* Hide dashboard chrome */
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Hide sidebar, header, and non-print elements */
          nav,
          header,
          aside,
          [data-sidebar],
          [data-header] {
            display: none !important;
          }

          /* Make main content full width */
          main {
            padding: 0 !important;
            overflow: visible !important;
          }

          /* Wrapper overrides */
          .flex.h-screen {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
          }

          .flex-1.overflow-y-auto {
            overflow: visible !important;
          }

          /* Hide print action bar and debug panel */
          .print-action-bar,
          [title="Debug Panel (Ctrl+Shift+D)"] {
            display: none !important;
          }

          /* Force white background and clean print */
          .print-page {
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 10mm !important;
          }

          /* Avoid page breaks inside table rows */
          .print-page table {
            page-break-inside: auto;
          }

          .print-page tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          /* Avoid page break inside totals */
          .print-totals {
            page-break-inside: avoid;
          }

          /* Remove all shadows and rounded corners */
          .print-page * {
            box-shadow: none !important;
          }
        }

        @page {
          size: A4;
          /* Setting margin to 0 removes browser default headers/footers
             (URL, date, page number). Content padding handled by .print-page. */
          margin: 0;
        }
      `}</style>

      {/* Action bar — hidden on print */}
      <div className="print-action-bar mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push(`/quotes/${quoteId}`)}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Quote
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </button>
      </div>

      {/* Print-optimised page */}
      <div className="print-page mx-auto max-w-[210mm] rounded-lg bg-white p-8 text-black shadow-sm dark:bg-white dark:text-black">
        {/* ---- Business Header + Quote Details ---- */}
        <div className="flex items-start justify-between">
          {/* Left: Business info */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {biz?.businessName || "Printforge"}
            </h1>
            <div className="mt-1 space-y-0.5 text-sm text-gray-600">
              {biz?.businessAddress && <p>{biz.businessAddress}</p>}
              {biz?.businessAbn && <p>ABN: {biz.businessAbn}</p>}
              {biz?.businessPhone && <p>Phone: {biz.businessPhone}</p>}
              {biz?.businessEmail && <p>Email: {biz.businessEmail}</p>}
            </div>
          </div>

          {/* Right: Quote details */}
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-900">QUOTE</h2>
            <div className="mt-1 space-y-0.5 text-sm text-gray-600">
              <p>
                <span className="font-medium text-gray-800">Quote #:</span>{" "}
                {quote.quoteNumber}
              </p>
              <p>
                <span className="font-medium text-gray-800">Date:</span>{" "}
                {formatDate(quote.createdAt)}
              </p>
              <p>
                <span className="font-medium text-gray-800">Expiry:</span>{" "}
                {formatDate(quote.expiryDate)}
              </p>
              <p>
                <span className="font-medium text-gray-800">Status:</span>{" "}
                {quote.status.charAt(0) + quote.status.slice(1).toLowerCase()}
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="my-6 border-gray-300" />

        {/* ---- Client Details ---- */}
        <div className="mb-6">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Quote For
          </h3>
          {client ? (
            <div className="text-sm text-gray-800">
              <p className="font-semibold text-gray-900">{client.name}</p>
              {client.company && <p>{client.company}</p>}
              {client.email && <p>{client.email}</p>}
              {client.phone && <p>{client.phone}</p>}
              {client.address && (
                <p className="whitespace-pre-line">{client.address}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">&mdash;</p>
          )}
        </div>

        {/* ---- Line Items Table ---- */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="py-2 pr-3 text-left font-semibold text-gray-800">
                #
              </th>
              <th className="py-2 pr-3 text-left font-semibold text-gray-800">
                Description
              </th>
              <th className="py-2 pr-3 text-right font-semibold text-gray-800">
                Qty
              </th>
              <th className="py-2 pr-3 text-right font-semibold text-gray-800">
                Unit Price
              </th>
              <th className="py-2 text-right font-semibold text-gray-800">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {quote.lineItems.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-4 text-center text-sm text-gray-500"
                >
                  No line items
                </td>
              </tr>
            ) : (
              quote.lineItems.map((item, idx) => (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="py-2 pr-3 text-gray-600">{idx + 1}</td>
                  <td className="py-2 pr-3 font-medium text-gray-900">
                    {item.description}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-gray-800">
                    {item.quantity}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-gray-800">
                    {formatCurrency(item.lineTotal)}
                  </td>
                  <td className="py-2 text-right tabular-nums font-medium text-gray-900">
                    {formatCurrency(item.lineTotal * item.quantity)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ---- Totals Block ---- */}
        <div className="print-totals mt-6 flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="tabular-nums font-medium text-gray-800">
                {formatCurrency(subtotal)}
              </span>
            </div>
            {quote.markupPct > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Markup ({quote.markupPct}%)
                </span>
                <span className="tabular-nums font-medium text-gray-800">
                  {formatCurrency(total - subtotal)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-gray-800 pt-2">
              <span className="text-base font-bold text-gray-900">
                Total (AUD)
              </span>
              <span className="text-base font-bold tabular-nums text-gray-900">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>

        {/* ---- Notes ---- */}
        {quote.notes && (
          <div className="mt-8">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Notes
            </h3>
            <p className="whitespace-pre-line text-sm text-gray-700">
              {quote.notes}
            </p>
          </div>
        )}

        {/* ---- Terms & Conditions ---- */}
        {termsText && (
          <div className="mt-6">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Terms &amp; Conditions
            </h3>
            <p className="whitespace-pre-line text-xs leading-relaxed text-gray-600">
              {termsText}
            </p>
          </div>
        )}

        {/* ---- Footer ---- */}
        <div className="mt-10 border-t border-gray-200 pt-4 text-center">
          <p className="text-xs text-gray-400">
            Generated by Printforge Quote
          </p>
        </div>
      </div>
    </>
  );
}
