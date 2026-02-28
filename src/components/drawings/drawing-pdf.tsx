"use client";

import { useState, useEffect } from "react";
import { Printer, ArrowLeft } from "lucide-react";

interface PartDrawing {
  id: string;
  drawingNumber: string;
  title: string;
  notes: string | null;
  sourceFilename: string;
  dimensionX: number;
  dimensionY: number;
  dimensionZ: number;
  volumeCm3: number;
  triangleCount: number;
  viewFront: string;
  viewSide: string;
  viewTop: string;
  viewIso: string;
  createdAt: string;
}

interface Settings {
  businessName?: string;
  businessAddress?: string;
  businessAbn?: string;
}

export function DrawingPdf({ id }: { id: string }) {
  const [drawing, setDrawing] = useState<PartDrawing | null>(null);
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/drawings/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/settings").then((r) => (r.ok ? r.json() : {})),
    ])
      .then(([drawingData, settingsData]) => {
        if (!drawingData) {
          setError("Drawing not found");
          return;
        }
        setDrawing(drawingData);
        setSettings(settingsData);
      })
      .catch(() => setError("Failed to load drawing"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !drawing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground">{error || "Drawing not found"}</p>
      </div>
    );
  }

  const dateStr = new Date(drawing.createdAt).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          nav, header, aside, [data-sidebar], [data-header], .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
          }
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          .drawing-page {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* Toolbar (hidden in print) */}
      <div className="no-print mb-4 flex items-center justify-between rounded-lg border bg-card p-3">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Drawing
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </button>
      </div>

      {/* Drawing sheet */}
      <div className="drawing-page mx-auto bg-white text-black" style={{ maxWidth: "1120px" }}>
        <div className="border-2 border-black" style={{ padding: "12px" }}>
          {/* Views grid — 2x2 layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
            {/* Front view */}
            <div style={{ border: "1px solid #d4d4d8", position: "relative" }}>
              <div style={{ position: "absolute", top: "4px", left: "8px", fontSize: "10px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Front View
              </div>
              <div style={{ position: "absolute", bottom: "4px", right: "8px", fontSize: "9px", fontFamily: "monospace", color: "#71717a" }}>
                {drawing.dimensionX.toFixed(1)} × {drawing.dimensionZ.toFixed(1)} mm
              </div>
              <div style={{ aspectRatio: "4/3", padding: "20px 8px 8px" }}>
                <img src={drawing.viewFront} alt="Front" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
            </div>

            {/* Side view */}
            <div style={{ border: "1px solid #d4d4d8", position: "relative" }}>
              <div style={{ position: "absolute", top: "4px", left: "8px", fontSize: "10px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Side View
              </div>
              <div style={{ position: "absolute", bottom: "4px", right: "8px", fontSize: "9px", fontFamily: "monospace", color: "#71717a" }}>
                {drawing.dimensionY.toFixed(1)} × {drawing.dimensionZ.toFixed(1)} mm
              </div>
              <div style={{ aspectRatio: "4/3", padding: "20px 8px 8px" }}>
                <img src={drawing.viewSide} alt="Side" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
            </div>

            {/* Top view */}
            <div style={{ border: "1px solid #d4d4d8", position: "relative" }}>
              <div style={{ position: "absolute", top: "4px", left: "8px", fontSize: "10px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Top View
              </div>
              <div style={{ position: "absolute", bottom: "4px", right: "8px", fontSize: "9px", fontFamily: "monospace", color: "#71717a" }}>
                {drawing.dimensionX.toFixed(1)} × {drawing.dimensionY.toFixed(1)} mm
              </div>
              <div style={{ aspectRatio: "4/3", padding: "20px 8px 8px" }}>
                <img src={drawing.viewTop} alt="Top" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
            </div>

            {/* Isometric view */}
            <div style={{ border: "1px solid #d4d4d8", position: "relative" }}>
              <div style={{ position: "absolute", top: "4px", left: "8px", fontSize: "10px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Isometric View
              </div>
              <div style={{ aspectRatio: "4/3", padding: "20px 8px 8px" }}>
                <img src={drawing.viewIso} alt="Isometric" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
            </div>
          </div>

          {/* Title block — bottom of page */}
          <div style={{ border: "2px solid black", display: "grid", gridTemplateColumns: "1fr auto" }}>
            {/* Left: business + notes */}
            <div style={{ borderRight: "1px solid black", padding: "8px 12px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700 }}>
                {settings.businessName || "Printforge"}
              </div>
              {settings.businessAddress && (
                <div style={{ fontSize: "9px", color: "#71717a", marginTop: "2px" }}>
                  {settings.businessAddress}
                </div>
              )}
              {settings.businessAbn && (
                <div style={{ fontSize: "9px", color: "#71717a" }}>
                  ABN: {settings.businessAbn}
                </div>
              )}
              {drawing.notes && (
                <div style={{ fontSize: "9px", color: "#52525b", marginTop: "4px", borderTop: "1px solid #e4e4e7", paddingTop: "4px" }}>
                  {drawing.notes}
                </div>
              )}
            </div>

            {/* Right: drawing info */}
            <div style={{ minWidth: "280px" }}>
              <div style={{ borderBottom: "1px solid black", padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "10px", fontWeight: 600, color: "#71717a" }}>DRAWING NO.</span>
                <span style={{ fontSize: "14px", fontWeight: 700, fontFamily: "monospace" }}>{drawing.drawingNumber}</span>
              </div>
              <div style={{ borderBottom: "1px solid black", padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "10px", fontWeight: 600, color: "#71717a" }}>TITLE</span>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>{drawing.title}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <div style={{ borderRight: "1px solid black", padding: "4px 12px" }}>
                  <div style={{ fontSize: "8px", fontWeight: 600, color: "#71717a" }}>DATE</div>
                  <div style={{ fontSize: "10px", fontFamily: "monospace" }}>{dateStr}</div>
                </div>
                <div style={{ padding: "4px 12px" }}>
                  <div style={{ fontSize: "8px", fontWeight: 600, color: "#71717a" }}>SCALE</div>
                  <div style={{ fontSize: "10px", fontFamily: "monospace" }}>N.T.S.</div>
                </div>
              </div>
              <div style={{ borderTop: "1px solid black", display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
                <div style={{ borderRight: "1px solid black", padding: "4px 12px" }}>
                  <div style={{ fontSize: "8px", fontWeight: 600, color: "#71717a" }}>X (mm)</div>
                  <div style={{ fontSize: "10px", fontFamily: "monospace" }}>{drawing.dimensionX.toFixed(1)}</div>
                </div>
                <div style={{ borderRight: "1px solid black", padding: "4px 12px" }}>
                  <div style={{ fontSize: "8px", fontWeight: 600, color: "#71717a" }}>Y (mm)</div>
                  <div style={{ fontSize: "10px", fontFamily: "monospace" }}>{drawing.dimensionY.toFixed(1)}</div>
                </div>
                <div style={{ padding: "4px 12px" }}>
                  <div style={{ fontSize: "8px", fontWeight: 600, color: "#71717a" }}>Z (mm)</div>
                  <div style={{ fontSize: "10px", fontFamily: "monospace" }}>{drawing.dimensionZ.toFixed(1)}</div>
                </div>
              </div>
              <div style={{ borderTop: "1px solid black", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <div style={{ borderRight: "1px solid black", padding: "4px 12px" }}>
                  <div style={{ fontSize: "8px", fontWeight: 600, color: "#71717a" }}>VOLUME</div>
                  <div style={{ fontSize: "10px", fontFamily: "monospace" }}>{drawing.volumeCm3.toFixed(2)} cm³</div>
                </div>
                <div style={{ padding: "4px 12px" }}>
                  <div style={{ fontSize: "8px", fontWeight: 600, color: "#71717a" }}>FILE</div>
                  <div style={{ fontSize: "10px", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "120px" }}>{drawing.sourceFilename}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
