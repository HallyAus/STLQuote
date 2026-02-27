# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.
> The SessionStart hook auto-injects this into context.

## Last Updated

- **Date:** 2026-02-27 10:45
- **Branch:** main
- **Focus:** v4.6.0 — Inventory Management

## Accomplished

- **This session — v4.6.0 (Inventory Management — 6 features)**:
  - **Stock Transaction History**: StockTransaction model logs every stock change (received/used/adjusted/auto_deduct) with timestamp, user, balance. API at `/api/stock-transactions` (filter by materialId/consumableId). Material stock adjust now logs transactions. Job completion auto-deduct now logs transactions. History button + modal on materials page with transaction table.
  - **Purchase Orders**: Full CRUD — PurchaseOrder + PurchaseOrderItem models, auto-generated PO-YYYY-NNN numbers. API routes: `/api/purchase-orders` (list/create), `/api/purchase-orders/[id]` (get/update/delete), `/api/purchase-orders/[id]/receive` (mark items received → auto-increase stock + log transactions, auto-set RECEIVED status). List page with status filter, detail page with items table, receive flow, status management. Sidebar: "Purchase Orders" in Equipment section (Pro only).
  - **Consumable Stock Adjustments**: +/- buttons on consumable cards + table rows (matching material pattern). API at `/api/consumables/[id]/stock`. Logs stock transactions.
  - **Supplier Invoice Upload**: Upload PDF/image receipt on PO detail page, stored as base64 data URL. Display image inline or download link for PDF. Remove invoice button.
  - **Reorder Suggestions**: Dashboard widget showing all materials + consumables below threshold with supplier name, suggested order quantity (2× threshold − current), email/website links to suppliers. Only shown when items need reordering. "Create PO" badge links to purchase orders.
  - **Material Usage Analytics**: API at `/api/materials/[id]/usage` aggregates stock transactions — total received, total used, job count, avg per job, cost of goods, monthly usage. Usage stats + mini bar chart shown in stock history modal.
  - **Migration 0022**: StockTransaction + PurchaseOrder + PurchaseOrderItem models + invoice fields
  - **Version bump**: 4.5.2 → 4.6.0
- **Prior session — v4.2.0**: AI Quote Assistant (Claude Haiku, Pro-only)
- **Prior**: v4.1.0 (calendar, bulk actions, templates, search), v4.0.0 SaaS, v3.0.0 features, etc.

## In Progress

- Nothing — all planned features complete

## Pending User Requests (queued during implementation)

1. **Private GitHub repo + Proxmox auto-pull**: Answered — works with SSH deploy key or PAT
2. **GST across regions**: Needs planning — AU, EU, UK, US (state-level), CA tax handling in quotes/invoices
3. **Roadmap filter**: Make status counts clickable to filter roadmap items
4. **Shopify email**: Custom Liquid email template for CRM launch announcement
5. **Stripe admin portal**: Fix Stripe for subscription collection in admin panel

## Next Steps

1. Run migration 0022 on production (`prisma migrate deploy`)
2. Address queued user requests above
3. End-to-end testing on production

## Context

- Version: 4.6.0
- App URL: crm.printforge.com.au
- Tiers: Free / Pro ($29/mo, $290/yr), 14-day trial; admins always Pro
- New models: StockTransaction, PurchaseOrder, PurchaseOrderItem
- New pages: `/purchase-orders`, `/purchase-orders/[id]`
- New API routes: `/api/stock-transactions`, `/api/purchase-orders/*`, `/api/consumables/[id]/stock`, `/api/materials/[id]/usage`
- Env vars needed: `ANTHROPIC_API_KEY`, Xero/Stripe env vars on production
