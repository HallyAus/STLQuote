"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Check, Calculator, Building2, Landmark, Receipt, FileText, CreditCard } from "lucide-react";
import { BatchPricingSettings } from "@/components/settings/batch-pricing-settings";
import { BillingSettings } from "@/components/settings/billing-settings";
import { LogoUpload } from "@/components/settings/logo-upload";
import { SkeletonListPage } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { BatchTier } from "@/lib/batch-pricing";
import { TAX_REGION_OPTIONS, getSubRegionOptions, getTaxDefaults, type TaxRegion } from "@/lib/tax-regions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Settings {
  id: string;
  userId: string;
  defaultCurrency: string;
  defaultElectricityRate: number;
  defaultMarkupPct: number;
  defaultLabourRate: number;
  defaultOverheadMonthly: number;
  estimatedMonthlyJobs: number;
  minimumCharge: number;
  businessName: string | null;
  businessAddress: string | null;
  businessAbn: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  businessLogoUrl: string | null;
  bankName: string | null;
  bankBsb: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  quoteTermsText: string | null;
  taxRegion: string;
  taxSubRegion: string | null;
  defaultTaxPct: number;
  taxLabel: string;
  taxIdNumber: string | null;
  taxInclusive: boolean;
  showTaxOnQuotes: boolean;
}

interface SettingsFormData {
  defaultCurrency: string;
  defaultElectricityRate: string;
  defaultMarkupPct: string;
  defaultLabourRate: string;
  defaultOverheadMonthly: string;
  estimatedMonthlyJobs: string;
  minimumCharge: string;
  businessName: string;
  businessAddress: string;
  businessAbn: string;
  businessPhone: string;
  businessEmail: string;
  bankName: string;
  bankBsb: string;
  bankAccountNumber: string;
  bankAccountName: string;
  quoteTermsText: string;
  taxRegion: string;
  taxSubRegion: string;
  defaultTaxPct: string;
  taxLabel: string;
  taxIdNumber: string;
  taxInclusive: boolean;
  showTaxOnQuotes: boolean;
}

type TabId = "general" | "business" | "banking" | "tax" | "quotes" | "billing";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: Calculator },
  { id: "business", label: "Business", icon: Building2 },
  { id: "banking", label: "Banking", icon: Landmark },
  { id: "tax", label: "Tax", icon: Receipt },
  { id: "quotes", label: "Quotes", icon: FileText },
  { id: "billing", label: "Billing", icon: CreditCard },
];

const CURRENCY_OPTIONS = [
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function settingsToFormData(settings: Settings): SettingsFormData {
  return {
    defaultCurrency: settings.defaultCurrency,
    defaultElectricityRate: String(settings.defaultElectricityRate),
    defaultMarkupPct: String(settings.defaultMarkupPct),
    defaultLabourRate: String(settings.defaultLabourRate),
    defaultOverheadMonthly: String(settings.defaultOverheadMonthly),
    estimatedMonthlyJobs: String(settings.estimatedMonthlyJobs),
    minimumCharge: String(settings.minimumCharge),
    businessName: settings.businessName ?? "",
    businessAddress: settings.businessAddress ?? "",
    businessAbn: settings.businessAbn ?? "",
    businessPhone: settings.businessPhone ?? "",
    businessEmail: settings.businessEmail ?? "",
    bankName: settings.bankName ?? "",
    bankBsb: settings.bankBsb ?? "",
    bankAccountNumber: settings.bankAccountNumber ?? "",
    bankAccountName: settings.bankAccountName ?? "",
    quoteTermsText: settings.quoteTermsText ?? "",
    taxRegion: settings.taxRegion ?? "AU",
    taxSubRegion: settings.taxSubRegion ?? "",
    defaultTaxPct: String(settings.defaultTaxPct ?? 10),
    taxLabel: settings.taxLabel ?? "GST",
    taxIdNumber: settings.taxIdNumber ?? "",
    taxInclusive: settings.taxInclusive ?? true,
    showTaxOnQuotes: settings.showTaxOnQuotes ?? false,
  };
}

function formDataToPayload(form: SettingsFormData) {
  return {
    defaultCurrency: form.defaultCurrency,
    defaultElectricityRate: parseFloat(form.defaultElectricityRate) || 0,
    defaultMarkupPct: parseFloat(form.defaultMarkupPct) || 0,
    defaultLabourRate: parseFloat(form.defaultLabourRate) || 0,
    defaultOverheadMonthly: parseFloat(form.defaultOverheadMonthly) || 0,
    estimatedMonthlyJobs: parseInt(form.estimatedMonthlyJobs) || 0,
    minimumCharge: parseFloat(form.minimumCharge) || 0,
    businessName: form.businessName.trim() || null,
    businessAddress: form.businessAddress.trim() || null,
    businessAbn: form.businessAbn.trim() || null,
    businessPhone: form.businessPhone.trim() || null,
    businessEmail: form.businessEmail.trim() || null,
    bankName: form.bankName.trim() || null,
    bankBsb: form.bankBsb.trim() || null,
    bankAccountNumber: form.bankAccountNumber.trim() || null,
    bankAccountName: form.bankAccountName.trim() || null,
    quoteTermsText: form.quoteTermsText.trim() || null,
    taxRegion: form.taxRegion,
    taxSubRegion: form.taxSubRegion.trim() || null,
    defaultTaxPct: parseFloat(form.defaultTaxPct) || 0,
    taxLabel: form.taxLabel.trim() || "GST",
    taxIdNumber: form.taxIdNumber.trim() || null,
    taxInclusive: form.taxInclusive,
    showTaxOnQuotes: form.showTaxOnQuotes,
  };
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [form, setForm] = useState<SettingsFormData>({
    defaultCurrency: "AUD",
    defaultElectricityRate: "0.30",
    defaultMarkupPct: "50",
    defaultLabourRate: "35",
    defaultOverheadMonthly: "0",
    estimatedMonthlyJobs: "20",
    minimumCharge: "15",
    businessName: "",
    businessAddress: "",
    businessAbn: "",
    businessPhone: "",
    businessEmail: "",
    bankName: "",
    bankBsb: "",
    bankAccountNumber: "",
    bankAccountName: "",
    quoteTermsText: "",
    taxRegion: "AU",
    taxSubRegion: "",
    defaultTaxPct: "10",
    taxLabel: "GST",
    taxIdNumber: "",
    taxInclusive: true,
    showTaxOnQuotes: false,
  });
  const [batchTiers, setBatchTiers] = useState<BatchTier[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // ---- Fetch settings ----

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data: Settings & { batchPricingTiers?: string | null } = await res.json();
      setForm(settingsToFormData(data));
      setLogoUrl(data.businessLogoUrl ?? null);
      if (data.batchPricingTiers) {
        try {
          const tiers = JSON.parse(data.batchPricingTiers);
          if (Array.isArray(tiers)) setBatchTiers(tiers);
        } catch {
          // Invalid JSON, use empty
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ---- Clear success message after delay ----

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(false), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  // ---- Update field helper ----

  function updateField(field: keyof SettingsFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ---- Save handler ----

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const payload = {
        ...formDataToPayload(form),
        businessLogoUrl: logoUrl,
        batchPricingTiers: batchTiers.length > 0 ? JSON.stringify(batchTiers) : null,
      };

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to save settings");
      }

      const data: Settings & { batchPricingTiers?: string | null } = await res.json();
      setForm(settingsToFormData(data));
      setLogoUrl(data.businessLogoUrl ?? null);
      if (data.batchPricingTiers) {
        try {
          const tiers = JSON.parse(data.batchPricingTiers);
          if (Array.isArray(tiers)) setBatchTiers(tiers);
        } catch {
          // Ignore
        }
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  // ---- Loading state ----

  if (loading) {
    return <SkeletonListPage />;
  }

  // ---- Render ----

  return (
    <div className="space-y-0">
      {/* Sticky page header */}
      <div className="sticky top-0 z-10 -mx-4 md:-mx-6 px-4 md:px-6 pt-0 pb-4 bg-background">
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure your business, calculator, and quote defaults.
        </p>
      </div>

      {/* Tab bar */}
      <div className="sticky top-[52px] z-10 -mx-4 md:-mx-6 px-4 md:px-6 bg-background border-b border-border">
        <nav className="-mb-px flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success-foreground">
          <Check className="h-4 w-4" />
          Settings saved successfully.
        </div>
      )}

      {/* Tab content */}
      <div className="pt-6">
        {activeTab === "general" && (
          <GeneralTab form={form} updateField={updateField} />
        )}
        {activeTab === "business" && (
          <BusinessTab
            form={form}
            updateField={updateField}
            logoUrl={logoUrl}
            onLogoChange={setLogoUrl}
            taxRegion={form.taxRegion as TaxRegion}
          />
        )}
        {activeTab === "banking" && (
          <BankingTab form={form} updateField={updateField} />
        )}
        {activeTab === "tax" && (
          <TaxTab form={form} setForm={setForm} updateField={updateField} />
        )}
        {activeTab === "quotes" && (
          <QuotesTab
            form={form}
            updateField={updateField}
            batchTiers={batchTiers}
            onBatchTiersChange={setBatchTiers}
          />
        )}
        {activeTab === "billing" && <BillingSettings />}
      </div>

      {/* Sticky save bar (hidden on billing tab) */}
      {activeTab !== "billing" && (
        <div className="sticky bottom-0 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border mt-6">
          <div className="flex items-center justify-end gap-3">
            {success && (
              <span className="flex items-center gap-1.5 text-sm text-success-foreground">
                <Check className="h-4 w-4" />
                Saved
              </span>
            )}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: General
// ---------------------------------------------------------------------------

function GeneralTab({
  form,
  updateField,
}: {
  form: SettingsFormData;
  updateField: (field: keyof SettingsFormData, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Calculator Defaults</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Default values pre-filled when using the cost calculator.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          label="Default currency"
          value={form.defaultCurrency}
          onChange={(e) => updateField("defaultCurrency", e.target.value)}
          options={CURRENCY_OPTIONS}
        />
        <Input
          label="Default electricity rate ($/kWh)"
          type="number"
          step="0.01"
          min="0"
          value={form.defaultElectricityRate}
          onChange={(e) => updateField("defaultElectricityRate", e.target.value)}
        />
        <Input
          label="Default markup (%)"
          type="number"
          step="0.1"
          min="0"
          value={form.defaultMarkupPct}
          onChange={(e) => updateField("defaultMarkupPct", e.target.value)}
        />
        <Input
          label="Default labour rate ($/hr)"
          type="number"
          step="0.01"
          min="0"
          value={form.defaultLabourRate}
          onChange={(e) => updateField("defaultLabourRate", e.target.value)}
        />
        <Input
          label="Default monthly overhead ($)"
          type="number"
          step="0.01"
          min="0"
          value={form.defaultOverheadMonthly}
          onChange={(e) => updateField("defaultOverheadMonthly", e.target.value)}
        />
        <Input
          label="Estimated monthly jobs"
          type="number"
          step="1"
          min="0"
          value={form.estimatedMonthlyJobs}
          onChange={(e) => updateField("estimatedMonthlyJobs", e.target.value)}
        />
        <Input
          label="Minimum charge ($)"
          type="number"
          step="0.01"
          min="0"
          value={form.minimumCharge}
          onChange={(e) => updateField("minimumCharge", e.target.value)}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Business
// ---------------------------------------------------------------------------

function BusinessTab({
  form,
  updateField,
  logoUrl,
  onLogoChange,
  taxRegion,
}: {
  form: SettingsFormData;
  updateField: (field: keyof SettingsFormData, value: string) => void;
  logoUrl: string | null;
  onLogoChange: (url: string | null) => void;
  taxRegion: TaxRegion;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Business Identity</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Appears on quotes, invoices, and PDF exports.
        </p>
      </div>

      <LogoUpload value={logoUrl} onChange={onLogoChange} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Business name"
          value={form.businessName}
          onChange={(e) => updateField("businessName", e.target.value)}
          placeholder="e.g. Printforge"
        />
        <Input
          label={getTaxDefaults(taxRegion).taxIdLabel}
          value={form.businessAbn}
          onChange={(e) => updateField("businessAbn", e.target.value)}
          placeholder={`Your ${getTaxDefaults(taxRegion).taxIdLabel}`}
        />
        <Input
          label="Phone"
          type="tel"
          value={form.businessPhone}
          onChange={(e) => updateField("businessPhone", e.target.value)}
          placeholder="e.g. 0400 000 000"
        />
        <Input
          label="Email"
          type="email"
          value={form.businessEmail}
          onChange={(e) => updateField("businessEmail", e.target.value)}
          placeholder="e.g. hello@printforge.com.au"
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Business address"
            value={form.businessAddress}
            onChange={(e) => updateField("businessAddress", e.target.value)}
            rows={2}
            placeholder="Street address, suburb, state, postcode"
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Banking
// ---------------------------------------------------------------------------

function BankingTab({
  form,
  updateField,
}: {
  form: SettingsFormData;
  updateField: (field: keyof SettingsFormData, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Payment Details</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Bank details shown on invoices for bank transfer payments.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Bank name"
          value={form.bankName}
          onChange={(e) => updateField("bankName", e.target.value)}
          placeholder="e.g. Commonwealth Bank"
        />
        <Input
          label="Account name"
          value={form.bankAccountName}
          onChange={(e) => updateField("bankAccountName", e.target.value)}
          placeholder="e.g. Printforge Pty Ltd"
        />
        <Input
          label="BSB"
          value={form.bankBsb}
          onChange={(e) => updateField("bankBsb", e.target.value)}
          placeholder="e.g. 062-000"
        />
        <Input
          label="Account number"
          value={form.bankAccountNumber}
          onChange={(e) => updateField("bankAccountNumber", e.target.value)}
          placeholder="e.g. 1234 5678"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Tax
// ---------------------------------------------------------------------------

function TaxTab({
  form,
  setForm,
  updateField,
}: {
  form: SettingsFormData;
  setForm: React.Dispatch<React.SetStateAction<SettingsFormData>>;
  updateField: (field: keyof SettingsFormData, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Tax Configuration</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Default tax rates applied to new invoices and quotes.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          label="Tax Region"
          value={form.taxRegion}
          onChange={(e) => {
            const region = e.target.value as TaxRegion;
            const defaults = getTaxDefaults(region);
            setForm((prev) => ({
              ...prev,
              taxRegion: region,
              taxSubRegion: "",
              defaultTaxPct: String(defaults.taxPct),
              taxLabel: defaults.taxLabel,
              taxInclusive: defaults.taxInclusive,
            }));
          }}
          options={TAX_REGION_OPTIONS}
        />
        {getSubRegionOptions(form.taxRegion as TaxRegion).length > 0 && (
          <Select
            label="State / Province"
            value={form.taxSubRegion}
            onChange={(e) => {
              const subCode = e.target.value;
              const defaults = getTaxDefaults(form.taxRegion as TaxRegion, subCode || null);
              setForm((prev) => ({
                ...prev,
                taxSubRegion: subCode,
                defaultTaxPct: String(defaults.taxPct),
                taxLabel: defaults.taxLabel,
              }));
            }}
            options={[
              { value: "", label: "Default" },
              ...getSubRegionOptions(form.taxRegion as TaxRegion),
            ]}
          />
        )}
        <Input
          label="Default Tax Rate (%)"
          type="number"
          step="0.01"
          min="0"
          value={form.defaultTaxPct}
          onChange={(e) => updateField("defaultTaxPct", e.target.value)}
        />
        <Input
          label="Tax Label"
          value={form.taxLabel}
          onChange={(e) => updateField("taxLabel", e.target.value)}
          placeholder="e.g. GST, VAT, Sales Tax"
        />
        <Input
          label={getTaxDefaults(form.taxRegion as TaxRegion).taxIdLabel}
          value={form.taxIdNumber}
          onChange={(e) => updateField("taxIdNumber", e.target.value)}
          placeholder={`Your ${getTaxDefaults(form.taxRegion as TaxRegion).taxIdLabel}`}
        />
      </div>
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.taxInclusive}
            onChange={(e) => setForm((prev) => ({ ...prev, taxInclusive: e.target.checked }))}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <span className="text-sm text-foreground">Prices include tax</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.showTaxOnQuotes}
            onChange={(e) => setForm((prev) => ({ ...prev, showTaxOnQuotes: e.target.checked }))}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <span className="text-sm text-foreground">Show tax on quotes</span>
        </label>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Quotes
// ---------------------------------------------------------------------------

function QuotesTab({
  form,
  updateField,
  batchTiers,
  onBatchTiersChange,
}: {
  form: SettingsFormData;
  updateField: (field: keyof SettingsFormData, value: string) => void;
  batchTiers: BatchTier[];
  onBatchTiersChange: (tiers: BatchTier[]) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Quote Defaults</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Default terms pre-filled on new quotes.
        </p>
      </div>
      <Textarea
        label="Default terms and conditions"
        value={form.quoteTermsText}
        onChange={(e) => updateField("quoteTermsText", e.target.value)}
        rows={6}
        placeholder="Enter your default terms and conditions. This will be pre-filled on new quotes."
      />
      <div className="border-t border-border pt-6">
        <BatchPricingSettings
          tiers={batchTiers}
          onChange={onBatchTiersChange}
        />
      </div>
    </div>
  );
}
