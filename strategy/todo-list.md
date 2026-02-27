# Task Tracking

> Quick reference for current work priorities. For detailed issue tracking use Beads (`bd list`).
> This file is for high-level planning; Beads handles granular task management.

## In Progress

_None_

## Up Next

- [ ] Deploy v5.0.0 — run migration 0026 on production DB
- [ ] Test Design Studio end-to-end (create → upload → chat → brief → create quote)
- [ ] Test module override system (admin panel → toggle feature for user)
- [ ] Design file serving route — `/api/designs/[id]/files/[fileId]/serve` (referenced by UI but not implemented)
- [ ] Wire UserModules component into admin-users.tsx edit modal
- [ ] Roadmap filter — make status counts clickable to filter items
- [ ] Shopify email — custom Liquid template for CRM launch announcement
- [ ] Stripe admin portal — fix subscription collection in admin panel
- [ ] Landing page polish — further improvements (ref: 3dprintdesk.com)
- [ ] CSP header — Content-Security-Policy with nonce-based script allowlist (P4 security)
- [ ] Session binding — tie 2FA cookie to specific session ID (P4 security)

## Blocked

- [ ] Upload error root cause — needs production server logs after deploy

## Done (Recent)

- [x] v5.0.0 — Design Studio + Module System (4 models, 10 API routes, 10 UI components, module overrides, migration 0026) — 2026-02-28
- [x] v4.15.3 — Security hardening for public release (HSTS, rate limits x13, SSRF, CSRF, path traversal, MIME validation, audit logging, email enumeration fix, token removal, cookie expiry, Content-Disposition sanitisation) — 2026-02-27
- [x] v4.15.0 — Mobile nav fix, admin seed data, 2FA (TOTP), upload error handling — 2026-02-27
- [x] v4.14.0 — Admin portal redo, analytics API, landing calculator demo, shipping costs, blog (20 posts), test fixes — 2026-02-26
- [x] v4.13.0 — Settings redesign, sticky headers, calculator embed, upload links — 2026-02-26
- [x] v4.1.0 — Print farm calendar, bulk actions, quote templates, global search — 2026-02-26
- [x] v3.0.0 — Suppliers, invoices, multi-currency, logo upload, tag input, client timeline, analytics, job photos, consumables — 2026-02-26
- [x] v1.0.0 — Feature-complete: auth, admin, G-code parser, landing page, migrations — 2026-02-25
- [x] Phase 1 — Calculator MVP, materials, printers, quotes, jobs, dashboard, settings, PDF export — 2026-02-25
- [x] Project kickoff — PRD review, stack decisions, initial scaffold — 2026-02-25
