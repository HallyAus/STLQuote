"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Check } from "lucide-react";
import { BatchPricingSettings } from "@/components/settings/batch-pricing-settings";
import { BillingSettings } from "@/components/settings/billing-settings";
import { WebhookSettings } from "@/components/settings/webhook-settings";
import { XeroSettings } from "@/components/settings/xero-settings";
import { LogoUpload } from "@/components/settings/logo-upload";
import type { BatchTier } from "@/lib/batch-pricing";

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
}

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
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure your default values for the calculator and quotes.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success-foreground">
          <Check className="h-4 w-4" />
          Settings saved successfully.
        </div>
      )}

      {/* Subscription & Billing */}
      <BillingSettings />

      {/* Calculator Defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Calculator Defaults</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              label="Default electricity rate ($/kWh)"
              type="number"
              step="0.01"
              min="0"
              value={form.defaultElectricityRate}
              onChange={(e) =>
                updateField("defaultElectricityRate", e.target.value)
              }
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
              onChange={(e) =>
                updateField("defaultOverheadMonthly", e.target.value)
              }
            />
            <Input
              label="Estimated monthly jobs"
              type="number"
              step="1"
              min="0"
              value={form.estimatedMonthlyJobs}
              onChange={(e) =>
                updateField("estimatedMonthlyJobs", e.target.value)
              }
            />
            <Input
              label="Minimum charge ($)"
              type="number"
              step="0.01"
              min="0"
              value={form.minimumCharge}
              onChange={(e) => updateField("minimumCharge", e.target.value)}
            />
            <Select
              label="Default currency"
              value={form.defaultCurrency}
              onChange={(e) => updateField("defaultCurrency", e.target.value)}
              options={CURRENCY_OPTIONS}
            />
          </div>
        </CardContent>
      </Card>

      {/* Business Details */}
      <Card>
        <CardHeader>
          <CardTitle>Business Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <LogoUpload value={logoUrl} onChange={setLogoUrl} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Business name"
              value={form.businessName}
              onChange={(e) => updateField("businessName", e.target.value)}
              placeholder="e.g. Printforge"
            />
            <Input
              label="ABN"
              value={form.businessAbn}
              onChange={(e) => updateField("businessAbn", e.target.value)}
              placeholder="Australian Business Number"
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
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Bank details shown on invoices for bank transfer payments.
          </p>
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
        </CardContent>
      </Card>

      {/* Quote Defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Quote Defaults</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            label="Default terms and conditions"
            value={form.quoteTermsText}
            onChange={(e) => updateField("quoteTermsText", e.target.value)}
            rows={6}
            placeholder="Enter your default terms and conditions. This will be pre-filled on new quotes."
          />
        </CardContent>
      </Card>

      {/* Batch Pricing */}
      <BatchPricingSettings
        tiers={batchTiers}
        onChange={setBatchTiers}
      />

      {/* Save button */}
      <div className="flex justify-end">
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

      {/* Webhooks (independent save) */}
      <WebhookSettings />

      {/* Xero Integration (independent save) */}
      <XeroSettings />
    </div>
  );
}
