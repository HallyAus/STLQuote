# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.
> The SessionStart hook auto-injects this into context.

## Last Updated

- **Date:** 2026-02-28 18:30
- **Branch:** main
- **Focus:** v5.3.0 — Cloud Storage + Onboarding Drip Emails

## Accomplished

- **This session — v5.2.0 + v5.3.0**:
  - **v5.2.0 — Cloud Storage** (Google Drive + OneDrive):
    - Schema: `CloudConnection` (encrypted tokens, per-user per-provider), `CloudSyncRecord` (sync state tracking), `DesignFile` additions (`cloudFileId`, `cloudProvider`). Migration 0028.
    - Encryption: `src/lib/encryption.ts` — AES-256-GCM with `CLOUD_ENCRYPTION_KEY` env var.
    - Feature gate: `cloud_storage` in `tier.ts` as Pro feature.
    - Google Drive: `src/lib/google-drive.ts` (OAuth + API), 3 API routes, settings card.
    - OneDrive: `src/lib/onedrive.ts` (Microsoft Graph OAuth + API), 3 API routes, settings card.
    - Cloud operations: 5 API routes (status/browse/import/export/folder-setup).
    - UI: `CloudFilePicker` modal, `CloudExportButton` dropdown.
    - Wired into design-files, quote-detail, invoice-detail, integrations page.
  - **v5.3.0 — Onboarding Drip Emails**:
    - Schema: `DripEmailLog` model (unique per userId+emailKey). Migration 0029.
    - 8-email sequence (Day 0–7): welcome from Daniel, then daily feature highlights (Calculator, Materials/Printers, Quotes/Clients, Invoicing, Jobs/Calendar, Design Studio, Integrations).
    - Every email includes integrations badge section (Xero, Shopify, Google Drive, OneDrive, Webhooks, CSV Export) + Pro trial countdown.
    - Check-on-login pattern: `DripEmailTrigger` component fires POST `/api/drip-emails` on dashboard mount, sends at most 1 email per call.
    - Build compiled + type-checked OK.
- **Prior sessions**: v5.0.0 Design Studio, v4.15.3 Security, v4.1.0–v4.15.0, v3.0.0, v1.0.0

## In Progress

_None_

## Pending User Requests

1. **Upload error investigation**: Root cause may be Docker filesystem permissions
2. **Roadmap filter**: Make status counts clickable to filter roadmap items
3. **Shopify email**: Custom Liquid email template for CRM launch announcement
4. **Stripe admin portal**: Fix Stripe for subscription collection in admin panel
5. **Landing page improvements**: User liked 3dprintdesk.com — consider further polish

## Next Steps

1. Deploy v5.3.0 — run migrations 0028 + 0029 on production DB
2. Set env vars: `GOOGLE_DRIVE_CLIENT_ID/SECRET`, `ONEDRIVE_CLIENT_ID/SECRET`, `ONEDRIVE_REDIRECT_URI`, `GOOGLE_DRIVE_REDIRECT_URI`, `CLOUD_ENCRYPTION_KEY`
3. Test cloud storage end-to-end (connect → browse → import → export)
4. Verify drip emails trigger on dashboard load for new users
5. Continue with pending user requests

## Context

- Version: 5.3.0
- App URL: crm.printforge.com.au
- Tiers: Free / Pro ($29/mo, $290/yr), 14-day trial; admins always Pro
- Cloud Storage: Pro feature, encrypted tokens (AES-256-GCM), Google Drive + OneDrive
- Cloud folder structure: `Printforge/Designs/`, `Printforge/Quotes/`, `Printforge/Invoices/`
- Drip Emails: 8-email onboarding sequence, check-on-login (no cron), integrations listed in every email
- New env vars needed: `GOOGLE_DRIVE_CLIENT_ID/SECRET`, `ONEDRIVE_CLIENT_ID/SECRET`, `CLOUD_ENCRYPTION_KEY`
