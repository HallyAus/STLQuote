"use client";

import { useState, useEffect } from "react";
import { X, Send, Loader2 } from "lucide-react";

interface PreviewLineItem {
  id: string;
  description: string;
  lineTotal: number;
  quantity: number;
}

interface PreviewQuote {
  quoteNumber: string;
  status: string;
  subtotal: number;
  total: number;
  currency: string;
  notes: string | null;
  terms: string | null;
  expiryDate: string | null;
  createdAt: string;
  client: {
    name: string;
    email: string | null;
    company?: string | null;
  } | null;
  lineItems: PreviewLineItem[];
}

interface BusinessInfo {
  name: string | null;
  email: string | null;
  phone: string | null;
}

interface QuotePreviewProps {
  quote: PreviewQuote;
  open: boolean;
  onClose: () => void;
  onSend: () => void;
  sending?: boolean;
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function QuotePreview({
  quote,
  open,
  onClose,
  onSend,
  sending = false,
}: QuotePreviewProps) {
  const [business, setBusiness] = useState<BusinessInfo>({
    name: null,
    email: null,
    phone: null,
  });

  // Fetch business settings for the header
  useEffect(() => {
    if (!open) return;
    async function loadBusiness() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setBusiness({
            name: data.businessName || null,
            email: data.businessEmail || null,
            phone: data.businessPhone || null,
          });
        }
      } catch {
        // Silently fail — defaults will show
      }
    }
    loadBusiness();
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const isExpired =
    quote.expiryDate && new Date(quote.expiryDate) < new Date();
  const businessName = business.name || "Printforge";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal container */}
      <div className="relative z-10 mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl shadow-2xl">
        {/* Sticky toolbar */}
        <div className="flex items-center justify-between bg-gray-900 px-4 py-3">
          <span className="text-sm font-medium text-gray-300">
            Preview &mdash; as your customer sees it
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onSend}
              disabled={sending}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Send Quote
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable preview body */}
        <div className="flex-1 overflow-y-auto bg-gray-100">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
            {/* Quote card */}
            <div className="overflow-hidden rounded-xl shadow-sm">
              {/* Blue header */}
              <div className="bg-blue-600 px-8 py-6 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-100">
                      Quote from
                    </p>
                    <p className="text-xl font-bold">{businessName}</p>
                    {business.email && (
                      <p className="text-sm text-blue-200">{business.email}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{quote.quoteNumber}</p>
                    <p className="text-sm text-blue-200">
                      {formatDate(quote.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white">
                {/* Expired banner */}
                {isExpired && (
                  <div className="border-b border-gray-100 bg-amber-50 px-8 py-4">
                    <p className="text-sm font-medium text-amber-800">
                      This quote expired on {formatDate(quote.expiryDate!)}.
                    </p>
                  </div>
                )}

                {/* Client info */}
                {quote.client && (
                  <div className="border-b border-gray-100 px-8 py-5">
                    <p className="text-xs font-medium uppercase text-gray-400">
                      Prepared for
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {quote.client.name}
                    </p>
                    {quote.client.company && (
                      <p className="text-sm text-gray-500">
                        {quote.client.company}
                      </p>
                    )}
                  </div>
                )}

                {/* Line items table */}
                <div className="px-8 py-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-2 text-left font-medium text-gray-500">
                          Item
                        </th>
                        <th className="py-2 text-right font-medium text-gray-500">
                          Qty
                        </th>
                        <th className="py-2 text-right font-medium text-gray-500">
                          Unit Price
                        </th>
                        <th className="py-2 text-right font-medium text-gray-500">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.lineItems.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-gray-100"
                        >
                          <td className="py-3 font-medium text-gray-900">
                            {item.description}
                          </td>
                          <td className="py-3 text-right text-gray-600">
                            {item.quantity}
                          </td>
                          <td className="py-3 text-right text-gray-600">
                            {formatCurrency(item.lineTotal)}
                          </td>
                          <td className="py-3 text-right font-medium text-gray-900">
                            {formatCurrency(item.lineTotal * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="mt-6 flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="text-gray-900">
                          {formatCurrency(quote.subtotal)}
                        </span>
                      </div>
                      {quote.total > quote.subtotal && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Markup</span>
                          <span className="text-gray-900">
                            {formatCurrency(quote.total - quote.subtotal)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between border-t-2 border-blue-600 pt-3">
                        <span className="text-lg font-bold text-gray-900">
                          Total
                        </span>
                        <span className="text-lg font-bold text-blue-600">
                          {formatCurrency(quote.total)} {quote.currency}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {quote.notes && (
                  <div className="border-t border-gray-100 px-8 py-5">
                    <p className="text-xs font-medium uppercase text-gray-400">
                      Notes
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                      {quote.notes}
                    </p>
                  </div>
                )}

                {/* Terms */}
                {quote.terms && (
                  <div className="border-t border-gray-100 px-8 py-5">
                    <p className="text-xs font-medium uppercase text-gray-400">
                      Terms & Conditions
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-xs text-gray-500">
                      {quote.terms}
                    </p>
                  </div>
                )}

                {/* Expiry info */}
                {quote.expiryDate && !isExpired && (
                  <div className="border-t border-gray-100 px-8 py-4">
                    <p className="text-center text-xs text-gray-400">
                      This quote is valid until {formatDate(quote.expiryDate)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <p className="mt-6 text-center text-xs text-gray-400">
              Powered by{" "}
              <span className="font-semibold text-blue-500">Printforge</span>{" "}
              &mdash; 3D Print Cost Calculator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
