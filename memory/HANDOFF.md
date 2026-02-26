# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.
> The SessionStart hook auto-injects this into context.

## Last Updated

- **Date:** 2026-02-26 22:10
- **Branch:** main
- **Focus:** v4.2.0 — AI Quote Assistant

## Accomplished

- **This session — v4.2.0 (AI Quote Assistant)**:
  - **AI Quote Assistant**: Pro-only feature — describe a print job in plain English, Claude Haiku 4.5 generates structured line items with material/printer selection, cost estimates. Lazy-init Anthropic SDK (`src/lib/anthropic.ts`), API route (`/api/ai/quote-draft`) with user-keyed rate limiting (10/15min), system prompt includes user's materials/printers/settings as context. "AI Draft" button + inline dialog on new quote page, populates line items, shows AI explanation. Feature-gated via `ai_assistant` in `PRO_FEATURES`.
  - **Version bump**: 4.1.0 → 4.2.0
- **Prior session — v4.1.0 (5 features + fixes)**:
  - **Print farm calendar**: Weekly Gantt grid view on Jobs page — printer rows, hour columns (8am–8pm), native HTML5 drag-to-reschedule, unscheduled jobs sidebar, week nav, mobile fallback
  - **Bulk actions**: Checkbox selection on quotes + invoices pages, floating action bar (change status, export CSV, delete; invoices also has mark paid), `useBulkSelection` hook, bulk API endpoints
  - **Quote templates**: Full CRUD (`/api/quote-templates`), save-as-template from quote detail, template dropdown on new quote form, Templates page + sidebar nav
  - **Global search + invoices**: Added invoices to search API (4th parallel query), invoices section in search dropdown with Receipt icon
  - **Material auto-deduct**: Already existed in `jobs/[id]/route.ts`, confirmed complete
  - **Fix: logger import**: `logSystem` → `log` in `quotes/route.ts`
  - **Fix: actions position**: Moved Actions card above Line Items on both quote-detail and invoice-detail
  - **Fix: dark mode charts**: Revenue charts use `var(--color-chart-*)` CSS vars instead of broken `hsl(var(--*))` refs (Tailwind v4 uses oklch)
  - **Migration 0017**: Job `scheduledStart`/`scheduledEnd` + `QuoteTemplate` model
  - **Version bump**: 4.0.4 → 4.1.0
- **Prior**: v4.0.0 SaaS (tiers, Stripe, Xero, waitlist), v3.0.0 features, auth, admin, calculator, quotes, jobs, PDF, portal, etc.

## In Progress

- Nothing — all planned features complete and pushed

## Next Steps

1. Run migration 0017 on production (`prisma migrate deploy`)
2. Configure Xero env vars on server (XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REDIRECT_URI)
3. Configure Stripe env vars on server if not already done
4. End-to-end testing on production
5. Product screenshots for marketing

## Context

- Version: 4.2.0
- App URL: crm.printforge.com.au
- Tiers: Free / Pro ($29/mo, $290/yr), 14-day trial; admins always Pro
- Stripe: SaaS billing, webhook at `/api/billing/webhook`
- Xero: Per-user OAuth2 at `/api/xero/*` (needs env vars)
- Waitlist: `/waitlist` public signup, `/register` also feeds waitlist, admin approval + email notification
- Email: Resend SDK, from hello@printforge.com.au
- New models: QuoteTemplate (templates CRUD), Job scheduling fields (calendar)
- New pages: `/quote-templates` (template management)
- New API routes: `/api/quote-templates`, `/api/quotes/bulk`, `/api/invoices/bulk`, `/api/ai/quote-draft`
- Env var needed: `ANTHROPIC_API_KEY` (for AI Quote Assistant)
