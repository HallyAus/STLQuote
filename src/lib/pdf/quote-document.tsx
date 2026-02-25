import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    color: "#171717",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    paddingBottom: 16,
  },
  businessName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
  },
  businessDetail: {
    fontSize: 9,
    color: "#666",
    marginTop: 2,
  },
  quoteNumber: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "right" as const,
  },
  quoteDate: {
    fontSize: 9,
    color: "#666",
    textAlign: "right" as const,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    color: "#333",
  },
  clientRow: {
    fontSize: 10,
    marginBottom: 2,
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  colDesc: { width: "35%", fontSize: 9 },
  colMaterial: { width: "12%", fontSize: 9, textAlign: "right" as const },
  colMachine: { width: "12%", fontSize: 9, textAlign: "right" as const },
  colLabour: { width: "12%", fontSize: 9, textAlign: "right" as const },
  colOverhead: { width: "12%", fontSize: 9, textAlign: "right" as const },
  colQty: { width: "7%", fontSize: 9, textAlign: "right" as const },
  colTotal: { width: "10%", fontSize: 9, textAlign: "right" as const },
  headerText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#666",
  },
  totalsBox: {
    marginTop: 16,
    alignItems: "flex-end" as const,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 200,
    paddingVertical: 3,
  },
  totalsLabel: {
    fontSize: 10,
    width: 100,
  },
  totalsValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    width: 100,
    textAlign: "right" as const,
  },
  totalFinal: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 200,
    paddingVertical: 6,
    borderTopWidth: 2,
    borderTopColor: "#2563eb",
    marginTop: 4,
  },
  totalFinalLabel: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    width: 100,
  },
  totalFinalValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
    width: 100,
    textAlign: "right" as const,
  },
  notes: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#fafafa",
    borderRadius: 4,
  },
  notesText: {
    fontSize: 9,
    color: "#666",
    lineHeight: 1.5,
  },
  terms: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  termsTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#666",
    marginBottom: 4,
  },
  termsText: {
    fontSize: 8,
    color: "#999",
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute" as const,
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center" as const,
    fontSize: 8,
    color: "#999",
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingTop: 8,
  },
});

function fmt(value: number): string {
  return `$${value.toFixed(2)}`;
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

interface QuotePDFData {
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
    month: "2-digit",
    year: "numeric",
  });
  const expiryStr = data.expiryDate
    ? new Date(data.expiryDate).toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.businessName}>
              {data.business.name || "Printforge"}
            </Text>
            {data.business.address && (
              <Text style={styles.businessDetail}>{data.business.address}</Text>
            )}
            {data.business.phone && (
              <Text style={styles.businessDetail}>{data.business.phone}</Text>
            )}
            {data.business.email && (
              <Text style={styles.businessDetail}>{data.business.email}</Text>
            )}
            {data.business.abn && (
              <Text style={styles.businessDetail}>ABN: {data.business.abn}</Text>
            )}
          </View>
          <View>
            <Text style={styles.quoteNumber}>{data.quoteNumber}</Text>
            <Text style={styles.quoteDate}>Date: {dateStr}</Text>
            {expiryStr && (
              <Text style={styles.quoteDate}>Valid until: {expiryStr}</Text>
            )}
            <Text style={styles.quoteDate}>Currency: {data.currency}</Text>
          </View>
        </View>

        {/* Client */}
        {data.client && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.clientRow}>{data.client.name}</Text>
            {data.client.company && (
              <Text style={styles.clientRow}>{data.client.company}</Text>
            )}
            {data.client.email && (
              <Text style={styles.clientRow}>{data.client.email}</Text>
            )}
            {data.client.phone && (
              <Text style={styles.clientRow}>{data.client.phone}</Text>
            )}
            {data.client.billingAddress && (
              <Text style={styles.clientRow}>{data.client.billingAddress}</Text>
            )}
          </View>
        )}

        {/* Line Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colDesc, styles.headerText]}>Description</Text>
              <Text style={[styles.colMaterial, styles.headerText]}>Material</Text>
              <Text style={[styles.colMachine, styles.headerText]}>Machine</Text>
              <Text style={[styles.colLabour, styles.headerText]}>Labour</Text>
              <Text style={[styles.colOverhead, styles.headerText]}>Overhead</Text>
              <Text style={[styles.colQty, styles.headerText]}>Qty</Text>
              <Text style={[styles.colTotal, styles.headerText]}>Total</Text>
            </View>
            {data.lineItems.map((item, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.colDesc}>{item.description}</Text>
                <Text style={styles.colMaterial}>{fmt(item.materialCost)}</Text>
                <Text style={styles.colMachine}>{fmt(item.machineCost)}</Text>
                <Text style={styles.colLabour}>{fmt(item.labourCost)}</Text>
                <Text style={styles.colOverhead}>{fmt(item.overheadCost)}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colTotal}>{fmt(item.lineTotal * item.quantity)}</Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{fmt(data.subtotal)}</Text>
            </View>
            {data.markupPct > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Markup ({data.markupPct}%)</Text>
                <Text style={styles.totalsValue}>
                  {fmt(data.subtotal * (data.markupPct / 100))}
                </Text>
              </View>
            )}
            <View style={styles.totalFinal}>
              <Text style={styles.totalFinalLabel}>Total</Text>
              <Text style={styles.totalFinalValue}>{fmt(data.total)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Terms */}
        {data.terms && (
          <View style={styles.terms}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            <Text style={styles.termsText}>{data.terms}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          {data.business.name || "Printforge"} — Generated by Printforge Quote
        </Text>
      </Page>
    </Document>
  );
}
