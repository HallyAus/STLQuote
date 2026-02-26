# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.
> The SessionStart hook auto-injects this into context.

## Last Updated

- **Date:** 2026-02-26 11:30
- **Branch:** main
- **Focus:** SaaS conversion — Stripe billing, tier system, Xero integration, waitlist, quote preview

## Accomplished

- **This session — SaaS conversion (v4.0.0)**:
  - **Markup hiding**: Removed markup % from quote PDF and client portal
  - **Database**: Migration 0012_subscriptions — User subscription fields, SubscriptionEvent, Waitlist, bank detail fields on Settings
  - **Tier system**: `src/lib/tier.ts` — Free/Pro, `getEffectiveTier()`, `hasFeature()`, `requireFeature()`
  - **Stripe billing**: checkout/portal/webhook routes at `/api/billing/*`
  - **Auth extension**: JWT + session include tier fields; `requireFeature()` gating
  - **Feature gating**: 20+ pro-only API routes gated
  - **Registration**: 14-day Pro trial on signup
  - **UI**: BillingSettings, sidebar Pro badges, dashboard trial banner, landing pricing section
  - **Xero**: Per-user OAuth2, auto-sync contacts/invoices/payments
  - **Quote preview**: Modal showing client view before sending
  - **Email**: from address → hello@printforge.com.au
  - **Marketing**: Facebook beta testers post, screenshots folder
  - **Waitlist + Bank details**: In progress via agents
- **Prior**: v3.0.0 features, auth, admin, calculator, quotes, jobs, PDF, portal, webhooks, CSV, etc.

## In Progress

- Waitlist system (public signup, admin approval, API routes)
- Bank details on invoice PDF/portal

## Next Steps

1. Complete waitlist + bank details
2. Invoice Stripe Connect (customer card payments)
3. Product screenshots for marketing
4. End-to-end testing after deploy

## Context

- Version: 4.0.0
- Tiers: Free / Pro ($29/mo, $290/yr), 14-day trial
- Stripe: SaaS billing, webhook at `/api/billing/webhook`
- Xero: Per-user OAuth2 at `/api/xero/*`
- Waitlist: `/waitlist` public signup, admin approval
- Email: Resend SDK, from hello@printforge.com.au
- New env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRO_MONTHLY_PRICE_ID, STRIPE_PRO_ANNUAL_PRICE_ID, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REDIRECT_URI
