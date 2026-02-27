# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.
> The SessionStart hook auto-injects this into context.

## Last Updated

- **Date:** 2026-02-27 12:45
- **Branch:** main
- **Focus:** v4.10.0 — UI Polish + Registration Fix + AI Invoice Enhancement

## Accomplished

- **This session — v4.10.0 (UI Polish + Fixes)**:
  - **Toast animations fix**: Added missing `slide-in-right` / `slide-out-right` keyframes in `globals.css`
  - **Dashboard redesign**: Gradient stat cards per type (blue/green/amber/etc.), `tabular-nums` on all numbers, arrow indicators on linked cards, stacked bar charts for job pipeline and stock health, dot-based status indicators in recent quotes list, better empty states with icons, tighter layout with `gap-3`/`gap-4`
  - **Sidebar polish**: Consistent `text-[13px]` nav items, `text-[11px]` section labels, 3px active border (`border-l-3`), `transition-all duration-150`, animated mobile overlay, version moved inline with footer
  - **Header polish**: `animate-scale-in` dropdown, rotating chevron, separated sign-out with border, `h-10 w-10` mobile menu button, removed version badge from header
  - **Table density pass**: Tightened `py-3` → `py-2.5` across all 5 table pages (Quotes, Invoices, Materials, Consumables, Purchase Orders)
  - **Dialog improvements**: `max-h-[85vh]` with `overflow-y-auto`, sticky footer with negative margin trick, `p-4` outer padding
  - **Shared status maps**: Added `INVOICE_STATUS`, `PO_STATUS`, `stockStatus()` to `status-colours.ts` as single source of truth
  - **Registration fix**: Non-admin users now get direct accounts when `waitlistMode` is off (default). New `waitlistMode` SystemConfig toggle in admin panel. Previously all non-admin users went to waitlist regardless of registration setting.
  - **AI invoice enhancement**: Supplier detection with 15 known 3D printing suppliers (Bambu Lab, Elegoo, Jaycar, Kingroon, etc.), `supplierId` matching against existing suppliers, `suggestedBrand`/`suggestedColour`/`suggestedMaterialType` extraction for materials. Updated ParsedItem/ParsedInvoice types. Pre-fills brand/colour/materialType in create form.
  - **Version bump**: 4.9.0 → 4.10.0
- **Prior session — v4.7.0**: Multi-Region Tax + Quote Rejection Emails
- **Prior**: v4.6.0 (Inventory), v4.2.0 (AI Quote), v4.1.0 (calendar, bulk, templates), v4.0.0 SaaS, v3.0.0 features

## In Progress

- UI Polish Batches 3–4 (form consistency, mobile experience) partially done — can continue next session

## Pending User Requests

1. **Roadmap filter**: Make status counts clickable to filter roadmap items
2. **Shopify email**: Custom Liquid email template for CRM launch announcement
3. **Stripe admin portal**: Fix Stripe for subscription collection in admin panel

## Next Steps

1. Deploy and test registration flow (waitlistMode off by default = open registration)
2. Continue UI polish: Batch 3 (form field consistency, loading skeletons) and Batch 4 (mobile touch targets, kanban list view)
3. Address pending user requests

## Context

- Version: 4.10.0
- App URL: crm.printforge.com.au
- Tiers: Free / Pro ($29/mo, $290/yr), 14-day trial; admins always Pro
- Registration: `waitlistMode` SystemConfig key controls waitlist vs direct signup (default: off = direct)
- AI invoice now extracts supplier + brand + colour for 3D printing materials
- Env vars needed: `ANTHROPIC_API_KEY`, Xero/Stripe env vars on production
