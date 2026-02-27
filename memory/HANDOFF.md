# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.
> The SessionStart hook auto-injects this into context.

## Last Updated

- **Date:** 2026-02-27 16:00
- **Branch:** main
- **Focus:** v4.13.0 — Settings Redesign + Sticky Headers + Calculator Embed + Customer Upload Links

## Accomplished

- **This session — v4.12.0–v4.13.0**:
  - **Settings page redesign**: Converted 7-card vertical scroll into 6-tab layout (General, Business, Banking, Tax, Quotes, Billing). Removed duplicate ABN field. Sticky tab bar + sticky save bar.
  - **Sticky page headers**: Added `sticky top-0 z-10` with negative margin trick across all 14 page components (Dashboard, Quotes, Invoices, Clients, Materials, Consumables, Purchase Orders, Suppliers, Jobs, Printers, Account, Integrations, Roadmap, Settings).
  - **Calculator embed on new quote page**: Added `onAddToQuote` callback prop to CalculatorForm, embedded in new-quote.tsx with collapsible section, page widens to `max-w-6xl` when calculator open.
  - **Customer upload links (shareable)**: Full feature:
    - Prisma models: `UploadLink` (token, label, active, expiry) + `QuoteRequest` (client info, file metadata, status workflow)
    - API routes: `GET/POST /api/upload-links`, `PUT/DELETE /api/upload-links/[id]`, `GET/POST /api/upload/[token]` (public), `GET /api/quote-requests`, `PUT/DELETE /api/quote-requests/[id]`, `GET /api/files/[...path]` (auth file serving)
    - Public upload page: `src/app/upload/[token]/page.tsx` — branded, drag-and-drop, rate-limited (10/hr)
    - Quote requests page: `src/components/quote-requests/quote-requests-page.tsx` — table/card list with status management, upload link management cards (create, copy URL, toggle active, regenerate token, delete)
    - Sidebar "Requests" nav item with pending count badge
    - Migration 0024: UploadLink + QuoteRequest tables
    - Middleware updated: `/upload` and `/api/upload` as public paths
  - **Shared status map**: Added `REQUEST_STATUS` to `status-colours.ts`
  - **Version bump**: 4.12.0 → 4.13.0
- **Prior session — v4.10.0–v4.11.0**: UI polish batches, dashboard redesign, sidebar/header polish, table density, dialog improvements, registration fix, AI invoice enhancement, skeleton loading, mobile touch targets, kanban mobile list view
- **Prior**: v4.7.0 (Multi-Region Tax), v4.6.0 (Inventory), v4.2.0 (AI Quote), v4.1.0 (calendar, bulk, templates), v4.0.0 SaaS, v3.0.0 features

## In Progress

- Need to commit and push all changes from this session (settings redesign + sticky headers + calculator embed + upload links)

## Pending User Requests

1. **Roadmap filter**: Make status counts clickable to filter roadmap items
2. **Shopify email**: Custom Liquid email template for CRM launch announcement
3. **Stripe admin portal**: Fix Stripe for subscription collection in admin panel

## Next Steps

1. Commit and push all changes
2. Deploy — migration 0024 will run automatically via `prisma migrate deploy`
3. Test upload link flow end-to-end (create link → share → customer uploads → appears in queue)
4. Address pending user requests

## Context

- Version: 4.13.0
- App URL: crm.printforge.com.au
- Tiers: Free / Pro ($29/mo, $290/yr), 14-day trial; admins always Pro
- Registration: `waitlistMode` SystemConfig key controls waitlist vs direct signup (default: off = direct)
- Upload links: public pages at `/upload/[token]`, files stored at `uploads/quote-requests/{userId}/`
- Env vars needed: `ANTHROPIC_API_KEY`, Xero/Stripe env vars on production
