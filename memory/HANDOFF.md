# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.
> The SessionStart hook auto-injects this into context.

## Last Updated

- **Date:** 2026-02-27 11:30
- **Branch:** main
- **Focus:** v4.7.0 — Multi-Region Tax + Quote Rejection Emails

## Accomplished

- **This session — v4.7.0 (Multi-Region Tax + Quote Rejection Emails)**:
  - **Multi-Region Tax Support**: New `src/lib/tax-regions.ts` with region configs (AU/EU/UK/US/CA), sub-regions (all 50 US states, 13 CA provinces, 15 EU countries), `getTaxDefaults()` helper, country-to-region mapping.
  - **Schema changes (migration 0023)**: Added tax fields to Settings (taxRegion, taxSubRegion, defaultTaxPct, taxLabel, taxIdNumber, taxInclusive, showTaxOnQuotes), Quote (taxPct, taxLabel, tax, taxInclusive), Invoice (taxLabel, taxInclusive), Client (country, stateProvince, taxExempt, taxIdNumber), QuoteTemplate (taxPct, taxLabel).
  - **Settings Tax & Region card**: Region dropdown auto-fills tax rate/label/inclusive. State/Province conditional dropdown. Editable tax rate, label, tax ID. Checkboxes for tax-inclusive and show-tax-on-quotes. Dynamic tax ID label (ABN/VAT/EIN) based on region.
  - **Client tax fields**: Country dropdown, state/province input, tax-exempt checkbox, client tax ID. Updated API routes and UI form.
  - **Quote tax support**: Tax fields in create/update schemas. Total calculation: `subtotalWithMarkup × taxPct`, tax-inclusive mode. Line-item recalculation includes tax. UI: editable tax % and label, tax-inclusive toggle, tax row in totals.
  - **Invoice dynamic tax**: Replaced hardcoded "GST" with dynamic `taxLabel` everywhere. Added taxLabel/taxInclusive to create/update schemas. Tax-inclusive mode in total calculation. UI: dynamic label, inclusive toggle, "incl. $X VAT" display.
  - **Invoice PDF**: Dynamic title (TAX INVOICE / VAT INVOICE / INVOICE), dynamic tax label, dynamic tax ID label, tax-inclusive total display.
  - **Quote PDF**: Optional tax line when taxPct > 0, tax-inclusive display, dynamic tax ID label.
  - **Portal page**: Shows tax row when taxPct > 0, tax-inclusive display. API returns new tax fields.
  - **Quote rejection win-back email**: On rejection via portal, client gets a branded email thanking them, offering to revise, with business contact info.
  - **Enhanced owner notification**: On accept/reject, owner gets branded email with business header, quote summary, line items, client contact, "View Quote" button, revise suggestion on rejection.
  - **Version bump**: 4.6.0 → 4.7.0
- **Prior session — v4.6.0**: Inventory Management (stock transactions, purchase orders, consumable stock, supplier invoices, reorder suggestions, material usage analytics)
- **Prior**: v4.2.0 (AI Quote Assistant), v4.1.0 (calendar, bulk actions, templates, search), v4.0.0 SaaS, v3.0.0 features, etc.

## In Progress

- Nothing — all planned features complete

## Pending User Requests (queued during implementation)

1. **Private GitHub repo + Proxmox auto-pull**: Answered — works with SSH deploy key or PAT
2. **Roadmap filter**: Make status counts clickable to filter roadmap items
3. **Shopify email**: Custom Liquid email template for CRM launch announcement
4. **Stripe admin portal**: Fix Stripe for subscription collection in admin panel

## Next Steps

1. Run migrations 0022 + 0023 on production (`prisma migrate deploy`)
2. Address queued user requests above
3. End-to-end testing on production

## Context

- Version: 4.7.0
- App URL: crm.printforge.com.au
- Tiers: Free / Pro ($29/mo, $290/yr), 14-day trial; admins always Pro
- New file: `src/lib/tax-regions.ts` — region configs + helpers
- Migration 0023: Tax fields on Settings, Quote, Invoice, Client, QuoteTemplate
- Tax regions: AU (10% GST), EU (19-25% VAT), UK (20% VAT), US (0-7.25% Sales Tax), CA (5-15% GST/HST/PST)
- Env vars needed: `ANTHROPIC_API_KEY`, Xero/Stripe env vars on production
