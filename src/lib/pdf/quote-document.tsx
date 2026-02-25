import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const ACCENT = "#2563eb";
const ACCENT_DARK = "#1d4ed8";
const DARK = "#0f172a";
const MEDIUM = "#475569";
const LIGHT = "#94a3b8";
const BORDER = "#e2e8f0";
const BG_SUBTLE = "#f8fafc";
const WHITE = "#ffffff";

const s = StyleSheet.create({
  // --- Page ---
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: DARK,
    paddingBottom: 70,
  },

  // --- Accent bar at top ---
  accentBar: {
    height: 6,
    backgroundColor: ACCENT,
  },

  // --- Body content ---
  body: {
    paddingHorizontal: 44,
    paddingTop: 28,
  },

  // --- Header row: business left, quote meta right ---
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  headerLeft: {
    flex: 1,
  },
  businessName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    letterSpacing: -0.5,
  },
  businessTagline: {
    fontSize: 9,
    color: LIGHT,
    marginTop: 2,
  },
  businessDetails: {
    marginTop: 10,
  },
  businessLine: {
    fontSize: 9,
    color: MEDIUM,
    marginBottom: 1.5,
  },
  headerRight: {
    alignItems: "flex-end" as const,
  },
  quoteLabel: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    letterSpacing: -1,
  },
  quoteNumber: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginTop: 2,
  },

  // --- Quote metadata pills ---
  metaRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  metaCard: {
    flex: 1,
    backgroundColor: BG_SUBTLE,
    borderRadius: 6,
    padding: 12,
  },
  metaLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: LIGHT,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },

  // --- Two-column: client + empty or summary ---
  twoCol: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 24,
  },
  clientBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 14,
  },
  clientLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: LIGHT,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  clientName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 4,
  },
  clientLine: {
    fontSize: 9,
    color: MEDIUM,
    marginBottom: 1.5,
  },

  // --- Table ---
  table: {
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: ACCENT,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: WHITE,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowAlt: {
    backgroundColor: BG_SUBTLE,
  },
  colNum: { width: "6%", fontSize: 9, color: LIGHT },
  colDesc: { width: "52%", fontSize: 9, color: DARK },
  colQty: { width: "10%", fontSize: 9, textAlign: "center" as const, color: MEDIUM },
  colUnit: { width: "16%", fontSize: 9, textAlign: "right" as const, color: MEDIUM },
  colTotal: { width: "16%", fontSize: 9, textAlign: "right" as const, fontFamily: "Helvetica-Bold", color: DARK },

  // --- Totals ---
  totalsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    marginBottom: 24,
  },
  totalsBox: {
    width: 240,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  totalsLabel: {
    fontSize: 10,
    color: MEDIUM,
  },
  totalsValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  totalFinalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: ACCENT,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  totalFinalLabel: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },
  totalFinalValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },

  // --- Notes ---
  notesBox: {
    backgroundColor: BG_SUBTLE,
    borderRadius: 6,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
  },
  notesLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 9,
    color: MEDIUM,
    lineHeight: 1.6,
  },

  // --- Terms ---
  termsBox: {
    marginBottom: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  termsLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: LIGHT,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  termsText: {
    fontSize: 7.5,
    color: LIGHT,
    lineHeight: 1.5,
  },

  // --- Footer ---
  footer: {
    position: "absolute" as const,
    bottom: 24,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center" as const,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
  },
  footerBusiness: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: MEDIUM,
  },
  footerPowered: {
    fontSize: 7.5,
    color: LIGHT,
  },
  footerAccent: {
    fontFamily: "Helvetica-Bold",
    color: ACCENT_DARK,
  },
});

function fmt(value: number, currency: string): string {
  const symbol = currency === "USD" ? "US$" : currency === "GBP" ? "\u00A3" : "$";
  return `${symbol}${value.toFixed(2)}`;
}

interface LineItem {
  description: string;
  materialCost: number;
  machineCost: number;
  labourCost: number;
  overheadCost: number;
  lineTotal: number;
  quantity: number;
}

export interface QuotePDFData {
  quoteNumber: string;
  createdAt: string;
  expiryDate: string | null;
  currency: string;
  subtotal: number;
  markupPct: number;
  total: number;
  notes: string | null;
  terms: string | null;
  client: {
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    billingAddress: string | null;
  } | null;
  lineItems: LineItem[];
  business: {
    name: string | null;
    address: string | null;
    abn: string | null;
    phone: string | null;
    email: string | null;
  };
}

export function QuoteDocument({ data }: { data: QuotePDFData }) {
  const dateStr = new Date(data.createdAt).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const expiryStr = data.expiryDate
    ? new Date(data.expiryDate).toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const biz = data.business;
  const businessName = biz.name || "Printforge";
  const cur = data.currency;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Top accent bar */}
        <View style={s.accentBar} />

        <View style={s.body}>
          {/* Header: business + QUOTE label */}
          <View style={s.headerRow}>
            <View style={s.headerLeft}>
              <Text style={s.businessName}>{businessName}</Text>
              {biz.address && <Text style={s.businessLine}>{biz.address}</Text>}
              <View style={s.businessDetails}>
                {biz.phone && <Text style={s.businessLine}>{biz.phone}</Text>}
                {biz.email && <Text style={s.businessLine}>{biz.email}</Text>}
                {biz.abn && <Text style={s.businessLine}>ABN {biz.abn}</Text>}
              </View>
            </View>
            <View style={s.headerRight}>
              <Text style={s.quoteLabel}>QUOTE</Text>
              <Text style={s.quoteNumber}>{data.quoteNumber}</Text>
            </View>
          </View>

          {/* Metadata cards row */}
          <View style={s.metaRow}>
            <View style={s.metaCard}>
              <Text style={s.metaLabel}>Issue Date</Text>
              <Text style={s.metaValue}>{dateStr}</Text>
            </View>
            {expiryStr && (
              <View style={s.metaCard}>
                <Text style={s.metaLabel}>Valid Until</Text>
                <Text style={s.metaValue}>{expiryStr}</Text>
              </View>
            )}
            <View style={s.metaCard}>
              <Text style={s.metaLabel}>Currency</Text>
              <Text style={s.metaValue}>{cur}</Text>
            </View>
            <View style={s.metaCard}>
              <Text style={s.metaLabel}>Items</Text>
              <Text style={s.metaValue}>{data.lineItems.length}</Text>
            </View>
          </View>

          {/* Client */}
          {data.client && (
            <View style={s.twoCol}>
              <View style={s.clientBox}>
                <Text style={s.clientLabel}>Bill To</Text>
                <Text style={s.clientName}>{data.client.name}</Text>
                {data.client.company && (
                  <Text style={s.clientLine}>{data.client.company}</Text>
                )}
                {data.client.email && (
                  <Text style={s.clientLine}>{data.client.email}</Text>
                )}
                {data.client.phone && (
                  <Text style={s.clientLine}>{data.client.phone}</Text>
                )}
                {data.client.billingAddress && (
                  <Text style={[s.clientLine, { marginTop: 4 }]}>
                    {data.client.billingAddress}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Line items table */}
          <View style={s.table}>
            {/* Header */}
            <View style={s.tableHeader}>
              <Text style={[s.colNum, s.tableHeaderText]}>#</Text>
              <Text style={[s.colDesc, s.tableHeaderText]}>Description</Text>
              <Text style={[s.colQty, s.tableHeaderText]}>Qty</Text>
              <Text style={[s.colUnit, s.tableHeaderText]}>Unit Price</Text>
              <Text style={[s.colTotal, s.tableHeaderText]}>Total</Text>
            </View>
            {/* Rows */}
            {data.lineItems.map((item, i) => (
              <View
                key={i}
                style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
              >
                <Text style={s.colNum}>{i + 1}</Text>
                <Text style={s.colDesc}>{item.description}</Text>
                <Text style={s.colQty}>{item.quantity}</Text>
                <Text style={s.colUnit}>{fmt(item.lineTotal, cur)}</Text>
                <Text style={s.colTotal}>
                  {fmt(item.lineTotal * item.quantity, cur)}
                </Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={s.totalsContainer}>
            <View style={s.totalsBox}>
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Subtotal</Text>
                <Text style={s.totalsValue}>{fmt(data.subtotal, cur)}</Text>
              </View>
              {data.markupPct > 0 && (
                <View style={s.totalsRow}>
                  <Text style={s.totalsLabel}>
                    Markup ({data.markupPct}%)
                  </Text>
                  <Text style={s.totalsValue}>
                    {fmt(data.subtotal * (data.markupPct / 100), cur)}
                  </Text>
                </View>
              )}
              <View style={s.totalFinalRow}>
                <Text style={s.totalFinalLabel}>Total Due</Text>
                <Text style={s.totalFinalValue}>
                  {fmt(data.total, cur)} {cur}
                </Text>
              </View>
            </View>
          </View>

          {/* Notes */}
          {data.notes && (
            <View style={s.notesBox}>
              <Text style={s.notesLabel}>Notes</Text>
              <Text style={s.notesText}>{data.notes}</Text>
            </View>
          )}

          {/* Terms & Conditions */}
          {data.terms && (
            <View style={s.termsBox}>
              <Text style={s.termsLabel}>Terms & Conditions</Text>
              <Text style={s.termsText}>{data.terms}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerBusiness}>{businessName}</Text>
          <Text style={s.footerPowered}>
            Powered by{" "}
            <Text style={s.footerAccent}>Printforge</Text>
            {" "}&mdash; 3D Print Cost Calculator
          </Text>
        </View>
      </Page>
    </Document>
  );
}
