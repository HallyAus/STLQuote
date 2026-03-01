"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { QrCode, Printer as PrinterIcon, Loader2, Download } from "lucide-react";

interface QrLabelModalProps {
  material: {
    id: string;
    materialType: string;
    brand: string | null;
    colour: string | null;
    barcode: string | null;
  };
  onClose: () => void;
}

export function QrLabelModal({ material, onClose }: QrLabelModalProps) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/materials/${material.id}/qr`)
      .then((r) => {
        if (r.ok) return r.blob();
        throw new Error("Failed to load QR");
      })
      .then((blob) => {
        setQrUrl(URL.createObjectURL(blob));
      })
      .catch(() => {
        setQrUrl(null);
      })
      .finally(() => setLoading(false));

    return () => {
      if (qrUrl) URL.revokeObjectURL(qrUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material.id]);

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Spool Label — ${material.materialType}</title>
        <style>
          @page { size: 62mm 40mm; margin: 2mm; }
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
          .label { display: flex; align-items: center; gap: 8px; padding: 4px; }
          .qr { width: 34mm; height: 34mm; }
          .qr img { width: 100%; height: 100%; }
          .info { flex: 1; }
          .type { font-size: 11pt; font-weight: 700; margin: 0; }
          .detail { font-size: 8pt; color: #666; margin: 2px 0 0; }
          .code { font-size: 7pt; font-family: monospace; color: #999; margin: 4px 0 0; letter-spacing: 0.5px; }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="qr"><img src="${qrUrl}" /></div>
          <div class="info">
            <p class="type">${material.materialType}</p>
            <p class="detail">${[material.brand, material.colour].filter(Boolean).join(" — ")}</p>
            <p class="code">${material.barcode || ""}</p>
          </div>
        </div>
        <script>window.onload = function() { window.print(); window.close(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  function handleDownload() {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `${material.materialType}-${material.barcode || material.id}.png`;
    a.click();
  }

  return (
    <Dialog open={true} onClose={onClose} maxWidth="max-w-sm">
      <DialogHeader onClose={onClose}>
        <DialogTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Label
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Label preview */}
        <div
          ref={printRef}
          className="mx-auto flex items-center gap-4 rounded-lg border border-border bg-white p-4"
          style={{ maxWidth: 320 }}
        >
          <div className="h-32 w-32 shrink-0">
            {loading ? (
              <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : qrUrl ? (
              <img src={qrUrl} alt="QR Code" className="h-full w-full" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                Error
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-black">{material.materialType}</p>
            <p className="text-sm text-gray-600">
              {[material.brand, material.colour].filter(Boolean).join(" — ")}
            </p>
            {material.barcode && (
              <p className="mt-1 font-mono text-[10px] text-gray-400">{material.barcode}</p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Print this label and stick it on your spool for quick scanning
        </p>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button variant="secondary" onClick={handleDownload} disabled={!qrUrl}>
          <Download className="mr-1.5 h-4 w-4" />
          Download
        </Button>
        <Button onClick={handlePrint} disabled={!qrUrl}>
          <PrinterIcon className="mr-1.5 h-4 w-4" />
          Print Label
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
