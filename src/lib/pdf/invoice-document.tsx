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
const PAID_GREEN = "#16a34a";

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

  // --- Header row: business left, invoice meta right ---
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
  invoiceLabel: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    letterSpacing: -1,
  },
  invoiceNumber: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginTop: 2,
  },

  // --- Paid watermark ---
  paidWatermark: {
    position: "absolute" as const,
    top: 280,
    left: 120,
    fontSize: 80,
    fontFamily: "Helvetica-Bold",
    color: PAID_GREEN,
    opacity: 0.08,
    transform: "rotate(-30deg)",
  },

  // --- Invoice metadata pills ---
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

  // --- Two-column: client ---
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
  colDesc: { width: "46%", fontSize: 9, color: DARK },
  colQty: { width: "10%", fontSize: 9, textAlign: "center" as const, color: MEDIUM },
  colUnit: { width: "19%", fontSize: 9, textAlign: "right" as const, color: MEDIUM },
  colTotal: { width: "19%", fontSize: 9, textAlign: "right" as const, fontFamily: "Helvetica-Bold", color: DARK },

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
  const symbol = currency === "USD" ? "US$" : currency === "GBP" ? "\u00A3" : currency === "EUR" ? "\u20AC" : "$";
  return `${symbol}${value.toFixed(2)}`;
}

export interface InvoicePDFData {
  invoiceNumber: string;
  createdAt: string;
  dueDate: string | null;
  currency: string;
  subtotal: number;
  taxPct: number;
  tax: number;
  total: number;
  status: string;
  notes: string | null;
  terms: string | null;
  client: {
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    billingAddress: string | null;
  } | null;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  business: {
    name: string | null;
    address: string | null;
    abn: string | null;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
  };
}

export function InvoiceDocument({ data }: { data: InvoicePDFData }) {
  const dateStr = new Date(data.createdAt).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const dueDateStr = data.dueDate
    ? new Date(data.dueDate).toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const biz = data.business;
  const businessName = biz.name || "Printforge";
  const cur = data.currency;
  const isPaid = data.status === "PAID";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Top accent bar */}
        <View style={s.accentBar} />

        {/* Paid watermark */}
        {isPaid && <Text style={s.paidWatermark}>PAID</Text>}

        <View style={s.body}>
          {/* Header: business + TAX INVOICE label */}
          <View style={s.headerRow}>
            <View style={s.headerLeft}>
              <Text style={s.businessName}>{businessName}</Text>
              {biz.address && <Text style={s.businessLine}>{biz.address}</Text>}
              <View style={s.businessDetails}>
                {biz.phone && <Text style={s.businessLine}>{biz.phone}</Text>}
                {biz.email && <Text style={s.businessLine}>{biz.email}</Text>}
                {biz.abn && (
                  <Text style={[s.businessLine, { fontFamily: "Helvetica-Bold" }]}>
                    ABN {biz.abn}
                  </Text>
                )}
              </View>
            </View>
            <View style={s.headerRight}>
              <Text style={s.invoiceLabel}>TAX INVOICE</Text>
              <Text style={s.invoiceNumber}>{data.invoiceNumber}</Text>
            </View>
          </View>

          {/* Metadata cards row */}
          <View style={s.metaRow}>
            <View style={s.metaCard}>
              <Text style={s.metaLabel}>Issue Date</Text>
              <Text style={s.metaValue}>{dateStr}</Text>
            </View>
            {dueDateStr && (
              <View style={s.metaCard}>
                <Text style={s.metaLabel}>Due Date</Text>
                <Text style={[s.metaValue, { color: isPaid ? PAID_GREEN : DARK }]}>
                  {dueDateStr}
                </Text>
              </View>
            )}
            <View style={s.metaCard}>
              <Text style={s.metaLabel}>Currency</Text>
              <Text style={s.metaValue}>{cur}</Text>
            </View>
            <View style={s.metaCard}>
              <Text style={s.metaLabel}>Status</Text>
              <Text style={[s.metaValue, isPaid ? { color: PAID_GREEN } : {}]}>
                {isPaid ? "PAID" : data.status}
              </Text>
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
                <Text style={s.colUnit}>{fmt(item.unitPrice, cur)}</Text>
                <Text style={s.colTotal}>{fmt(item.lineTotal, cur)}</Text>
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
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>
                  GST ({data.taxPct}%)
                </Text>
                <Text style={s.totalsValue}>{fmt(data.tax, cur)}</Text>
              </View>
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

          {/* Payment Terms */}
          {data.terms && (
            <View style={s.termsBox}>
              <Text style={s.termsLabel}>Payment Terms</Text>
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
