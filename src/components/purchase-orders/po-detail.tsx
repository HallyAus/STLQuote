"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  ArrowLeft,
  PackageCheck,
  Trash2,
  Upload,
  FileText,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface POItem {
  id: string;
  description: string;
  quantity: number;
  unitCost: number;
  receivedQty: number;
  materialId: string | null;
  consumableId: string | null;
  material: { id: string; materialType: string; brand: string | null; colour: string | null; stockQty: number } | null;
  consumable: { id: string; name: string; category: string; stockQty: number } | null;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  expectedDelivery: string | null;
  totalCost: number;
  notes: string | null;
  invoiceUrl: string | null;
  invoiceFilename: string | null;
  createdAt: string;
  updatedAt: string;
  supplier: { id: string; name: string; email: string | null; phone: string | null; website: string | null };
  items: POItem[];
}

const STATUS_VARIANTS: Record<string, "default" | "success" | "warning" | "destructive"> = {
  DRAFT: "default",
  ORDERED: "warning",
  RECEIVED: "success",
  CANCELLED: "destructive",
};

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "ORDERED", label: "Ordered" },
  { value: "RECEIVED", label: "Received" },
  { value: "CANCELLED", label: "Cancelled" },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function PODetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});
  const [showReceive, setShowReceive] = useState(false);

  const fetchPO = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/purchase-orders/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPo(data);
      // Initialise receive qtys from current received
      const qtys: Record<string, number> = {};
      for (const item of data.items) {
        qtys[item.id] = item.receivedQty;
      }
      setReceiveQtys(qtys);
    } catch (err) {
      console.error("Failed to fetch PO:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPO();
  }, [fetchPO]);

  // ---- Update status ----
  async function handleStatusChange(newStatus: string) {
    if (!po) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPo(updated);
      }
    } catch (err) {
      console.error("Status update error:", err);
    } finally {
      setSaving(false);
    }
  }

  // ---- Update notes ----
  async function handleNotesBlur(newNotes: string) {
    if (!po || newNotes === po.notes) return;
    try {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: newNotes || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPo(updated);
      }
    } catch (err) {
      console.error("Notes update error:", err);
    }
  }

  // ---- Receive items ----
  async function handleReceive() {
    if (!po) return;
    setReceiving(true);
    try {
      const items = po.items.map((item) => ({
        itemId: item.id,
        receivedQty: receiveQtys[item.id] ?? item.receivedQty,
      }));

      const res = await fetch(`/api/purchase-orders/${id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (res.ok) {
        const updated = await res.json();
        setPo(updated);
        setShowReceive(false);
      }
    } catch (err) {
      console.error("Receive error:", err);
    } finally {
      setReceiving(false);
    }
  }

  // ---- Delete PO ----
  async function handleDelete() {
    if (!confirm("Delete this purchase order? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/purchase-orders/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        router.push("/purchase-orders");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  // ---- Invoice upload ----
  async function handleInvoiceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !po) return;

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Maximum 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const res = await fetch(`/api/purchase-orders/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceUrl: dataUrl,
            invoiceFilename: file.name,
          }),
        });
        if (res.ok) {
          const updated = await res.json();
          setPo(updated);
        }
      } catch (err) {
        console.error("Invoice upload error:", err);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleRemoveInvoice() {
    if (!po) return;
    try {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceUrl: null, invoiceFilename: null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPo(updated);
      }
    } catch (err) {
      console.error("Remove invoice error:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Purchase order not found.</p>
        <Link href="/purchase-orders">
          <Button variant="ghost" className="mt-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to purchase orders
          </Button>
        </Link>
      </div>
    );
  }

  const allReceived = po.items.every((i) => i.receivedQty >= i.quantity);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/purchase-orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{po.poNumber}</h1>
          <p className="text-sm text-muted-foreground">{po.supplier.name}</p>
        </div>
        <Badge variant={STATUS_VARIANTS[po.status] ?? "default"} className="text-sm">
          {po.status}
        </Badge>
      </div>

      {/* Actions card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Select
            value={po.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            options={STATUS_OPTIONS}
            className="w-36"
            disabled={saving}
          />
          {po.status !== "RECEIVED" && po.status !== "CANCELLED" && (
            <Button variant="secondary" onClick={() => setShowReceive(!showReceive)}>
              <PackageCheck className="mr-2 h-4 w-4" />
              Receive Items
            </Button>
          )}
          <Button variant="ghost" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Line Items ({po.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-3 py-2 font-medium text-muted-foreground">Description</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground text-right">Qty</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground text-right">Unit Cost</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground text-right">Line Total</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground text-right">Received</th>
                  {showReceive && (
                    <th className="px-3 py-2 font-medium text-muted-foreground text-right">Receive Qty</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {po.items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <div>{item.description}</div>
                      {item.material && (
                        <span className="text-xs text-muted-foreground">
                          Material — stock: {item.material.stockQty}
                        </span>
                      )}
                      {item.consumable && (
                        <span className="text-xs text-muted-foreground">
                          Consumable — stock: {item.consumable.stockQty}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{item.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums">${item.unitCost.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      ${(item.quantity * item.unitCost).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span className={item.receivedQty >= item.quantity ? "text-emerald-500" : ""}>
                        {item.receivedQty}/{item.quantity}
                      </span>
                    </td>
                    {showReceive && (
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          min={item.receivedQty}
                          max={item.quantity}
                          value={receiveQtys[item.id] ?? item.receivedQty}
                          onChange={(e) =>
                            setReceiveQtys((prev) => ({
                              ...prev,
                              [item.id]: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="w-20 ml-auto"
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td colSpan={3} className="px-3 py-2 font-semibold text-right">Total</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    ${po.totalCost.toFixed(2)}
                  </td>
                  <td colSpan={showReceive ? 2 : 1} />
                </tr>
              </tfoot>
            </table>
          </div>
          {showReceive && (
            <div className="mt-3 flex justify-end">
              <Button onClick={handleReceive} disabled={receiving}>
                {receiving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                ) : (
                  <><PackageCheck className="mr-2 h-4 w-4" />Confirm Received</>
                )}
              </Button>
            </div>
          )}
          {allReceived && po.status === "RECEIVED" && (
            <p className="mt-2 text-sm text-emerald-500 font-medium">All items received.</p>
          )}
        </CardContent>
      </Card>

      {/* Invoice / Receipt */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Supplier Invoice / Receipt</CardTitle>
        </CardHeader>
        <CardContent>
          {po.invoiceUrl ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{po.invoiceFilename ?? "Receipt"}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={handleRemoveInvoice}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              {po.invoiceUrl.startsWith("data:image/") ? (
                <img
                  src={po.invoiceUrl}
                  alt="Invoice"
                  className="max-w-md rounded-lg border border-border"
                />
              ) : po.invoiceUrl.startsWith("data:application/pdf") ? (
                <a
                  href={po.invoiceUrl}
                  download={po.invoiceFilename ?? "invoice.pdf"}
                  className="text-sm text-primary hover:underline"
                >
                  Download PDF
                </a>
              ) : (
                <a
                  href={po.invoiceUrl}
                  download={po.invoiceFilename ?? "receipt"}
                  className="text-sm text-primary hover:underline"
                >
                  Download file
                </a>
              )}
            </div>
          ) : (
            <div>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-6 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
                <Upload className="h-5 w-5" />
                <span>Upload invoice or receipt (PDF, image — max 5MB)</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleInvoiceUpload}
                />
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-muted-foreground">Supplier</span>
              <p className="font-medium">{po.supplier.name}</p>
              {po.supplier.email && (
                <p className="text-muted-foreground">{po.supplier.email}</p>
              )}
              {po.supplier.phone && (
                <p className="text-muted-foreground">{po.supplier.phone}</p>
              )}
            </div>
            <div>
              <span className="text-muted-foreground">Expected delivery</span>
              <p className="font-medium">
                {po.expectedDelivery
                  ? new Date(po.expectedDelivery).toLocaleDateString("en-AU")
                  : "\u2014"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Created</span>
              <p className="font-medium">
                {new Date(po.createdAt).toLocaleDateString("en-AU")}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Last updated</span>
              <p className="font-medium">
                {new Date(po.updatedAt).toLocaleDateString("en-AU")}
              </p>
            </div>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Notes</span>
            <Textarea
              defaultValue={po.notes ?? ""}
              onBlur={(e) => handleNotesBlur(e.target.value)}
              placeholder="Add notes..."
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
