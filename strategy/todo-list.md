# Task Tracking

> Quick reference for current work priorities. For detailed issue tracking use Beads (`bd list`).
> This file is for high-level planning; Beads handles granular task management.

## In Progress

- [ ] Phase 1 — Calculator MVP: cost calculator with all input fields, real-time calculation, save presets

## Up Next

- [ ] Phase 2 — Materials & Printers: material library and printer profiles that feed into calculator
- [ ] Phase 3 — Quotes: quote generation from calculator, PDF export, basic client info
- [ ] Phase 4 — CRM & Jobs: client management, quote status tracking, job tracking
- [ ] Phase 5 — Dashboard & Inventory: overview dashboard, stock management, analytics
- [ ] Phase 6 — Polish: email integration, Gcode parsing, landing page

## Phase 1 Breakdown (Calculator MVP)

- [ ] Project scaffold and dev environment setup
- [ ] Database schema (Prisma) — Settings, Printer, Material, CalculatorPreset tables
- [ ] Auth setup (NextAuth.js) — email/password login
- [ ] App layout — sidebar navigation, dark mode toggle
- [ ] Calculator page — all cost input fields (material, machine, labour, overhead, markup)
- [ ] Real-time cost calculation engine (client-side)
- [ ] Cost breakdown visualisation (chart/table)
- [ ] Save/load calculator presets
- [ ] Settings page — default values (electricity rate, labour rate, markup, currency)
- [ ] Responsive design — mobile-friendly calculator
- [ ] Docker Compose setup for local dev (Next.js + PostgreSQL)

## Blocked

_None_

## Done (Recent)

- [x] Project kickoff — PRD review, stack decisions, initial scaffold — 2026-02-25
