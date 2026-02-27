# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.
> The SessionStart hook auto-injects this into context.

## Last Updated

- **Date:** 2026-02-27 17:55
- **Branch:** main
- **Focus:** v4.14.0 — Admin Portal Redo + Landing Page Calculator Demo + Blog + Shipping Costs

## Accomplished

- **This session — v4.14.0**:
  - **Admin portal redo**: Split monolithic 2,245-line admin page into 6 focused sub-components:
    - `admin-overview.tsx` — Key metric cards, signup/quote bar charts (pure CSS), top users table, system health, recent activity
    - `admin-users.tsx` — User table with search/filter, all modals (create/edit/delete)
    - `admin-waitlist.tsx` — Waitlist management with approve/reject
    - `admin-system.tsx` — Merged Deploys + Config + Logs into 4 collapsible sections
    - `admin-email.tsx` — Merged Email + Newsletter into 3 cards
    - `admin-billing.tsx` — Stripe config, subscribers, events (already existed, minor fix)
    - `admin-types.ts` — Shared TypeScript interfaces
    - Admin page.tsx rewritten as thin shell with 6-tab navigation
  - **Admin analytics API**: New `GET /api/admin/analytics` endpoint — 13 parallel Prisma queries for signups, quotes by status, conversion rate, weekly revenue, top users, per-user storage, system health
  - **Landing page calculator demo**: Interactive `CalculatorDemo` component with 8 range sliders (weight, time, material cost, labour, shipping, packaging, markup, quantity), real-time cost breakdown with stacked bar chart, CTA to register. Uses `calculateTotalCost()` directly — no API calls.
  - **Shipping & packaging costs**: Added `ShippingCostInput` interface to calculator lib, new "Shipping & Packaging" section in calculator form, per-unit flat costs added after markup but before minimum charge, displayed in cost breakdown.
  - **Blog**: 20 SEO-focused blog posts in `src/lib/blog-posts.ts` (static data, no CMS), listing page at `/blog` with featured hero + grid, detail pages at `/blog/[slug]` with prose typography and related posts. Backdated weekly from 2026-02-25 to 2025-10-15. `@tailwindcss/typography` plugin added. Middleware updated for public `/blog` path.
  - **Test fixes**: Fixed floating point precision in calculator and STL parser tests
  - **Version bump**: 4.13.0 → 4.14.0
- **Prior session — v4.13.0**: Settings redesign, sticky headers, calculator embed on new quote, customer upload links
- **Prior**: v4.11.0 (UI polish), v4.7.0 (Multi-Region Tax), v4.6.0 (Inventory), v4.2.0 (AI Quote), v4.1.0 (calendar, bulk, templates), v4.0.0 SaaS, v3.0.0 features

## In Progress

- Need to commit and push all changes from this session

## Pending User Requests

1. **Roadmap filter**: Make status counts clickable to filter roadmap items
2. **Shopify email**: Custom Liquid email template for CRM launch announcement
3. **Stripe admin portal**: Fix Stripe for subscription collection in admin panel
4. **Landing page improvements**: User liked 3dprintdesk.com — consider further landing page polish

## Next Steps

1. Commit and push all changes
2. Deploy
3. Test admin portal tabs, analytics charts, blog pages
4. Address pending user requests

## Context

- Version: 4.14.0
- App URL: crm.printforge.com.au
- Tiers: Free / Pro ($29/mo, $290/yr), 14-day trial; admins always Pro
- Registration: `waitlistMode` SystemConfig key controls waitlist vs direct signup (default: off = direct)
- Upload links: public pages at `/upload/[token]`, files stored at `uploads/quote-requests/{userId}/`
- Blog: static data in `src/lib/blog-posts.ts`, public at `/blog` and `/blog/[slug]`
- Admin tabs: Overview, Users, Waitlist, System, Email, Billing
- Env vars needed: `ANTHROPIC_API_KEY`, Xero/Stripe env vars on production
