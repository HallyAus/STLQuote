"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, Check, X, FileText } from "lucide-react";

interface PortalQuote {
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
  client: { name: string; email: string | null; company: string | null } | null;
  lineItems: {
    id: string;
    description: string;
    materialCost: number;
    machineCost: number;
    labourCost: number;
    overheadCost: number;
    lineTotal: number;
    quantity: number;
  }[];
  business: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function PortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [quote, setQuote] = useState<PortalQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [responded, setResponded] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");

  useEffect(() => {
    async function fetchQuote() {
      try {
        const res = await fetch(`/api/portal/${token}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Quote not found");
        }
        const data = await res.json();
        setQuote(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchQuote();
  }, [token]);

  async function handleRespond(action: "accept" | "reject") {
    const actionLabel = action === "accept" ? "accept" : "decline";
    if (!confirm(`Are you sure you want to ${actionLabel} this quote?`)) return;

    setResponding(true);
    try {
      const res = await fetch(`/api/portal/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to respond");
      setResponded(true);
      setResponseMessage(data.message);
      if (quote) {
        setQuote({ ...quote, status: data.status });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setResponding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg bg-white p-8 shadow-sm text-center max-w-md">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-lg font-medium text-gray-900">Quote not found</p>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!quote) return null;

  const isExpired = quote.expiryDate && new Date(quote.expiryDate) < new Date();
  const canRespond = quote.status === "SENT" && !isExpired && !responded;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="rounded-t-xl bg-blue-600 px-8 py-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100">Quote from</p>
              <p className="text-xl font-bold">{quote.business.name || "Printforge"}</p>
              {quote.business.email && (
                <p className="text-sm text-blue-200">{quote.business.email}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{quote.quoteNumber}</p>
              <p className="text-sm text-blue-200">{formatDate(quote.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-b-xl bg-white shadow-sm">
          {/* Response banner */}
          {responded && (
            <div className="border-b border-gray-100 bg-green-50 px-8 py-4">
              <p className="text-sm font-medium text-green-800">{responseMessage}</p>
            </div>
          )}

          {/* Status banner for non-SENT quotes */}
          {quote.status !== "SENT" && !responded && (
            <div className="border-b border-gray-100 bg-gray-50 px-8 py-4">
              <p className="text-sm font-medium text-gray-600">
                This quote has been{" "}
                <span className="font-bold">{quote.status.toLowerCase()}</span>.
              </p>
            </div>
          )}

          {/* Expired banner */}
          {isExpired && quote.status === "SENT" && (
            <div className="border-b border-gray-100 bg-amber-50 px-8 py-4">
              <p className="text-sm font-medium text-amber-800">
                This quote expired on {formatDate(quote.expiryDate!)}.
              </p>
            </div>
          )}

          {/* Client info */}
          {quote.client && (
            <div className="border-b border-gray-100 px-8 py-5">
              <p className="text-xs font-medium uppercase text-gray-400">Prepared for</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{quote.client.name}</p>
              {quote.client.company && (
                <p className="text-sm text-gray-500">{quote.client.company}</p>
              )}
            </div>
          )}

          {/* Line items */}
          <div className="px-8 py-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 text-left font-medium text-gray-500">Item</th>
                  <th className="py-2 text-right font-medium text-gray-500">Qty</th>
                  <th className="py-2 text-right font-medium text-gray-500">Unit Price</th>
                  <th className="py-2 text-right font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-3 font-medium text-gray-900">{item.description}</td>
                    <td className="py-3 text-right text-gray-600">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-600">{formatCurrency(item.lineTotal)}</td>
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
                  <span className="text-gray-900">{formatCurrency(quote.subtotal)}</span>
                </div>
                {quote.markupPct > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Markup ({quote.markupPct}%)</span>
                    <span className="text-gray-900">
                      {formatCurrency(quote.subtotal * (quote.markupPct / 100))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t-2 border-blue-600 pt-3">
                  <span className="text-lg font-bold text-gray-900">Total</span>
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
              <p className="text-xs font-medium uppercase text-gray-400">Notes</p>
              <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}

          {/* Terms */}
          {quote.terms && (
            <div className="border-t border-gray-100 px-8 py-5">
              <p className="text-xs font-medium uppercase text-gray-400">Terms & Conditions</p>
              <p className="mt-2 text-xs text-gray-500 whitespace-pre-wrap">{quote.terms}</p>
            </div>
          )}

          {/* Action buttons */}
          {canRespond && (
            <div className="border-t border-gray-100 px-8 py-6">
              <div className="flex gap-3">
                <button
                  onClick={() => handleRespond("accept")}
                  disabled={responding}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {responding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Accept Quote
                </button>
                <button
                  onClick={() => handleRespond("reject")}
                  disabled={responding}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {responding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  Decline Quote
                </button>
              </div>
            </div>
          )}

          {/* Expiry info */}
          {quote.expiryDate && !isExpired && quote.status === "SENT" && (
            <div className="border-t border-gray-100 px-8 py-4">
              <p className="text-center text-xs text-gray-400">
                This quote is valid until {formatDate(quote.expiryDate)}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          Powered by Printforge Quote
        </p>
      </div>
    </div>
  );
}
