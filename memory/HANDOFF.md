# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.
> The SessionStart hook auto-injects this into context.

## Last Updated

- **Date:** 2026-02-26 14:00
- **Branch:** main
- **Focus:** SaaS conversion v4.0.0 — deployed and live at crm.printforge.com.au

## Accomplished

- **This session — SaaS conversion (v4.0.0)**:
  - **Markup hiding**: Removed markup % from quote PDF and client portal
  - **Database**: Migrations 0012–0014 (subscriptions, payment terms, waitlist business name)
  - **Tier system**: `src/lib/tier.ts` — Free/Pro, `getEffectiveTier()`, `hasFeature()`, `requireFeature()`
  - **Admin Pro bypass**: ADMIN/SUPER_ADMIN always get Pro access regardless of subscription
  - **Stripe billing**: checkout/portal/webhook routes at `/api/billing/*`
  - **Auth extension**: JWT + session include tier fields; `requireFeature()` gating
  - **Feature gating**: 20+ pro-only API routes gated
  - **Registration**: 14-day Pro trial on signup, non-admin → waitlist
  - **UI**: BillingSettings, sidebar Pro badges, dashboard trial banner, landing pricing section
  - **Settings page fix**: Added ToastProvider to root layout + Suspense around BillingSettings
  - **Xero**: Per-user OAuth2, auto-sync contacts/invoices/payments (needs env vars configured)
  - **Quote preview**: Modal showing client view before sending
  - **Waitlist**: Public signup at `/waitlist`, admin approval tab, business name collection, auto-populate settings on approval, admin email notifications on signup
  - **Bank details**: Settings form, invoice PDF rendering, send route
  - **Client payment terms**: paymentTermsDays on Client, auto-fill invoice due dates, editable due date on invoice detail
  - **Per-user numbering**: Quote (PF-YYYY-NNN) and invoice (INV-YYYY-NNN) numbers sequential per user
  - **Admin Grant Pro**: Checkbox in edit user modal to grant/revoke Pro without Stripe
  - **Admin notifications**: Email to ADMIN_EMAIL when someone joins waitlist
  - **Email**: from address → hello@printforge.com.au
  - **Landing page**: `/?preview=true` bypass for logged-in users
  - **Marketing**: Facebook beta testers post, screenshots folder
  - **URL**: All references use crm.printforge.com.au
- **Prior**: v3.0.0 features, auth, admin, calculator, quotes, jobs, PDF, portal, webhooks, CSV, etc.

## In Progress

- Nothing — all planned features complete

## Next Steps

1. Configure Xero env vars on server (XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REDIRECT_URI)
2. Configure Stripe env vars on server if not already done
3. Invoice Stripe Connect (customer card payments) — future feature
4. Product screenshots for marketing (requires running instance)
5. End-to-end testing on production

## Context

- Version: 4.0.0
- App URL: crm.printforge.com.au
- Tiers: Free / Pro ($29/mo, $290/yr), 14-day trial; admins always Pro
- Stripe: SaaS billing, webhook at `/api/billing/webhook`
- Xero: Per-user OAuth2 at `/api/xero/*` (needs env vars)
- Waitlist: `/waitlist` public signup, `/register` also feeds waitlist, admin approval + email notification
- Email: Resend SDK, from hello@printforge.com.au
- Env vars needed: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRO_MONTHLY_PRICE_ID, STRIPE_PRO_ANNUAL_PRICE_ID, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REDIRECT_URI
