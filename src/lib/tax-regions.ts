// Multi-region tax configuration
// Pure constants — no DB, no API calls

export type TaxRegion = "AU" | "EU" | "UK" | "US" | "CA";

export interface SubRegion {
  code: string;
  name: string;
  taxPct: number;
  taxLabel: string;
}

export interface RegionConfig {
  code: TaxRegion;
  name: string;
  defaultTaxPct: number;
  taxLabel: string;
  invoiceTitle: string;
  taxIdLabel: string;
  taxInclusive: boolean;
  subRegions?: SubRegion[];
}

export const TAX_REGIONS: Record<TaxRegion, RegionConfig> = {
  AU: {
    code: "AU",
    name: "Australia",
    defaultTaxPct: 10,
    taxLabel: "GST",
    invoiceTitle: "TAX INVOICE",
    taxIdLabel: "ABN",
    taxInclusive: true,
  },
  EU: {
    code: "EU",
    name: "European Union",
    defaultTaxPct: 20,
    taxLabel: "VAT",
    invoiceTitle: "VAT INVOICE",
    taxIdLabel: "VAT Number",
    taxInclusive: true,
    subRegions: [
      { code: "AT", name: "Austria", taxPct: 20, taxLabel: "VAT" },
      { code: "BE", name: "Belgium", taxPct: 21, taxLabel: "VAT" },
      { code: "DE", name: "Germany", taxPct: 19, taxLabel: "VAT" },
      { code: "DK", name: "Denmark", taxPct: 25, taxLabel: "VAT" },
      { code: "ES", name: "Spain", taxPct: 21, taxLabel: "VAT" },
      { code: "FI", name: "Finland", taxPct: 25.5, taxLabel: "VAT" },
      { code: "FR", name: "France", taxPct: 20, taxLabel: "VAT" },
      { code: "GR", name: "Greece", taxPct: 24, taxLabel: "VAT" },
      { code: "IE", name: "Ireland", taxPct: 23, taxLabel: "VAT" },
      { code: "IT", name: "Italy", taxPct: 22, taxLabel: "VAT" },
      { code: "LU", name: "Luxembourg", taxPct: 17, taxLabel: "VAT" },
      { code: "NL", name: "Netherlands", taxPct: 21, taxLabel: "VAT" },
      { code: "PL", name: "Poland", taxPct: 23, taxLabel: "VAT" },
      { code: "PT", name: "Portugal", taxPct: 23, taxLabel: "VAT" },
      { code: "SE", name: "Sweden", taxPct: 25, taxLabel: "VAT" },
    ],
  },
  UK: {
    code: "UK",
    name: "United Kingdom",
    defaultTaxPct: 20,
    taxLabel: "VAT",
    invoiceTitle: "VAT INVOICE",
    taxIdLabel: "VAT Number",
    taxInclusive: true,
  },
  US: {
    code: "US",
    name: "United States",
    defaultTaxPct: 0,
    taxLabel: "Sales Tax",
    invoiceTitle: "INVOICE",
    taxIdLabel: "EIN",
    taxInclusive: false,
    subRegions: [
      { code: "AL", name: "Alabama", taxPct: 4, taxLabel: "Sales Tax" },
      { code: "AK", name: "Alaska", taxPct: 0, taxLabel: "Sales Tax" },
      { code: "AZ", name: "Arizona", taxPct: 5.6, taxLabel: "Sales Tax" },
      { code: "AR", name: "Arkansas", taxPct: 6.5, taxLabel: "Sales Tax" },
      { code: "CA", name: "California", taxPct: 7.25, taxLabel: "Sales Tax" },
      { code: "CO", name: "Colorado", taxPct: 2.9, taxLabel: "Sales Tax" },
      { code: "CT", name: "Connecticut", taxPct: 6.35, taxLabel: "Sales Tax" },
      { code: "DE", name: "Delaware", taxPct: 0, taxLabel: "Sales Tax" },
      { code: "FL", name: "Florida", taxPct: 6, taxLabel: "Sales Tax" },
      { code: "GA", name: "Georgia", taxPct: 4, taxLabel: "Sales Tax" },
      { code: "HI", name: "Hawaii", taxPct: 4, taxLabel: "GET" },
      { code: "ID", name: "Idaho", taxPct: 6, taxLabel: "Sales Tax" },
      { code: "IL", name: "Illinois", taxPct: 6.25, taxLabel: "Sales Tax" },
      { code: "IN", name: "Indiana", taxPct: 7, taxLabel: "Sales Tax" },
      { code: "IA", name: "Iowa", taxPct: 6, taxLabel: "Sales Tax" },
      { code: "KS", name: "Kansas", taxPct: 6.5, taxLabel: "Sales Tax" },
      { code: "KY", name: "Kentucky", taxPct: 6, taxLabel: "Sales Tax" },
      { code: "LA", name: "Louisiana", taxPct: 4.45, taxLabel: "Sales Tax" },
      { code: "ME", name: "Maine", taxPct: 5.5, taxLabel: "Sales Tax" },
      { code: "MD", name: "Maryland", taxPct: 6, taxLabel: "Sales Tax" },
      { code: "MA", name: "Massachusetts", taxPct: 6.25, taxLabel: "Sales Tax" },
      { code: "MI", name: "Michigan", taxPct: 6, taxLabel: "Sales Tax" },
      { code: "MN", name: "Minnesota", taxPct: 6.875, taxLabel: "Sales Tax" },
      { code: "MS", name: "Mississippi", taxPct: 7, taxLabel: "Sales Tax" },
      { code: "MO", name: "Missouri", taxPct: 4.225, taxLabel: "Sales Tax" },
      { code: "MT", name: "Montana", taxPct: 0, taxLabel: "Sales Tax" },
      { code: "NE", name: "Nebraska", taxPct: 5.5, taxLabel: "Sales Tax" },
      { code: "NV", name: "Nevada", taxPct: 6.85, taxLabel: "Sales Tax" },
      { code: "NH", name: "New Hampshire", taxPct: 0, taxLabel: "Sales Tax" },
      { code: "NJ", name: "New Jersey", taxPct: 6.625, taxLabel: "Sales Tax" },
      { code: "NM", name: "New Mexico", taxPct: 4.875, taxLabel: "GRT" },
      { code: "NY", name: "New York", taxPct: 4, taxLabel: "Sales Tax" },
      { code: "NC", name: "North Carolina", taxPct: 4.75, taxLabel: "Sales Tax" },
      { code: "ND", name: "North Dakota", taxPct: 5, taxLabel: "Sales Tax" },
      { code: "OH", name: "Ohio", taxPct: 5.75, taxLabel: "Sales Tax" },
      { code: "OK", name: "Oklahoma", taxPct: 4.5, taxLabel: "Sales Tax" },
      { code: "OR", name: "Oregon", taxPct: 0, taxLabel: "Sales Tax" },
      { code: "PA", name: "Pennsylvania", taxPct: 6, taxLabel: "Sales Tax" },
      { code: "RI", name: "Rhode Island", taxPct: 7, taxLabel: "Sales Tax" },
      { code: "SC", name: "South Carolina", taxPct: 6, taxLabel: "Sales Tax" },
      { code: "SD", name: "South Dakota", taxPct: 4.2, taxLabel: "Sales Tax" },
      { code: "TN", name: "Tennessee", taxPct: 7, taxLabel: "Sales Tax" },
      { code: "TX", name: "Texas", taxPct: 6.25, taxLabel: "Sales Tax" },
      { code: "UT", name: "Utah", taxPct: 6.1, taxLabel: "Sales Tax" },
      { code: "VT", name: "Vermont", taxPct: 6, taxLabel: "Sales Tax" },
      { code: "VA", name: "Virginia", taxPct: 5.3, taxLabel: "Sales Tax" },
      { code: "WA", name: "Washington", taxPct: 6.5, taxLabel: "Sales Tax" },
      { code: "WV", name: "West Virginia", taxPct: 6, taxLabel: "Sales Tax" },
      { code: "WI", name: "Wisconsin", taxPct: 5, taxLabel: "Sales Tax" },
      { code: "WY", name: "Wyoming", taxPct: 4, taxLabel: "Sales Tax" },
      { code: "DC", name: "District of Columbia", taxPct: 6, taxLabel: "Sales Tax" },
    ],
  },
  CA: {
    code: "CA",
    name: "Canada",
    defaultTaxPct: 5,
    taxLabel: "GST",
    invoiceTitle: "INVOICE",
    taxIdLabel: "BN/GST Number",
    taxInclusive: false,
    subRegions: [
      { code: "AB", name: "Alberta", taxPct: 5, taxLabel: "GST" },
      { code: "BC", name: "British Columbia", taxPct: 12, taxLabel: "GST+PST" },
      { code: "MB", name: "Manitoba", taxPct: 12, taxLabel: "GST+PST" },
      { code: "NB", name: "New Brunswick", taxPct: 15, taxLabel: "HST" },
      { code: "NL", name: "Newfoundland & Labrador", taxPct: 15, taxLabel: "HST" },
      { code: "NS", name: "Nova Scotia", taxPct: 15, taxLabel: "HST" },
      { code: "NT", name: "Northwest Territories", taxPct: 5, taxLabel: "GST" },
      { code: "NU", name: "Nunavut", taxPct: 5, taxLabel: "GST" },
      { code: "ON", name: "Ontario", taxPct: 13, taxLabel: "HST" },
      { code: "PE", name: "Prince Edward Island", taxPct: 15, taxLabel: "HST" },
      { code: "QC", name: "Quebec", taxPct: 14.975, taxLabel: "GST+QST" },
      { code: "SK", name: "Saskatchewan", taxPct: 11, taxLabel: "GST+PST" },
      { code: "YT", name: "Yukon", taxPct: 5, taxLabel: "GST" },
    ],
  },
};

export const TAX_REGION_OPTIONS = Object.values(TAX_REGIONS).map((r) => ({
  value: r.code,
  label: `${r.name} (${r.code})`,
}));

/** Get tax defaults for a region + optional sub-region */
export function getTaxDefaults(
  region: TaxRegion,
  subRegionCode?: string | null
): {
  taxPct: number;
  taxLabel: string;
  invoiceTitle: string;
  taxIdLabel: string;
  taxInclusive: boolean;
} {
  const config = TAX_REGIONS[region];
  if (!config) {
    return {
      taxPct: 10,
      taxLabel: "GST",
      invoiceTitle: "TAX INVOICE",
      taxIdLabel: "ABN",
      taxInclusive: true,
    };
  }

  // Check sub-region
  if (subRegionCode && config.subRegions) {
    const sub = config.subRegions.find((s) => s.code === subRegionCode);
    if (sub) {
      return {
        taxPct: sub.taxPct,
        taxLabel: sub.taxLabel,
        invoiceTitle: config.invoiceTitle,
        taxIdLabel: config.taxIdLabel,
        taxInclusive: config.taxInclusive,
      };
    }
  }

  return {
    taxPct: config.defaultTaxPct,
    taxLabel: config.taxLabel,
    invoiceTitle: config.invoiceTitle,
    taxIdLabel: config.taxIdLabel,
    taxInclusive: config.taxInclusive,
  };
}

/** Get sub-region options for a region (empty array if none) */
export function getSubRegionOptions(region: TaxRegion): { value: string; label: string }[] {
  const config = TAX_REGIONS[region];
  if (!config?.subRegions) return [];
  return config.subRegions.map((s) => ({
    value: s.code,
    label: `${s.name} (${s.code})`,
  }));
}

/** All country codes for client country dropdown */
export const COUNTRY_OPTIONS = [
  { value: "", label: "Use business default" },
  { value: "AU", label: "Australia" },
  { value: "AT", label: "Austria" },
  { value: "BE", label: "Belgium" },
  { value: "CA", label: "Canada" },
  { value: "DK", label: "Denmark" },
  { value: "FI", label: "Finland" },
  { value: "FR", label: "France" },
  { value: "DE", label: "Germany" },
  { value: "GR", label: "Greece" },
  { value: "IE", label: "Ireland" },
  { value: "IT", label: "Italy" },
  { value: "LU", label: "Luxembourg" },
  { value: "NL", label: "Netherlands" },
  { value: "NZ", label: "New Zealand" },
  { value: "PL", label: "Poland" },
  { value: "PT", label: "Portugal" },
  { value: "ES", label: "Spain" },
  { value: "SE", label: "Sweden" },
  { value: "UK", label: "United Kingdom" },
  { value: "US", label: "United States" },
];

/** Map a country code to its parent tax region */
export function countryToTaxRegion(country: string): TaxRegion | null {
  if (country === "AU") return "AU";
  if (country === "UK") return "UK";
  if (country === "US") return "US";
  if (country === "CA") return "CA";
  // EU countries
  const euCodes = ["AT", "BE", "DE", "DK", "ES", "FI", "FR", "GR", "IE", "IT", "LU", "NL", "PL", "PT", "SE"];
  if (euCodes.includes(country)) return "EU";
  return null;
}
