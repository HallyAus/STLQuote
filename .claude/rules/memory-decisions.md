# Memory: Decisions

> Past choices made during this project for consistency. Dated entries.
> Claude adds here when a decision is made. Auto-loaded every session.

## Format

Each entry: `[YYYY-MM-DD] Decision — Rationale`

## Decisions

<!-- Claude: add new entries at the top -->

- [2026-02-25] GitHub Actions deploy uses appleboy/ssh-action@v1 with concurrency group — simple, no Docker registry needed, cancel-in-progress disabled to avoid partial deploys
- [2026-02-25] Project name: printforge-quote — ties to Printforge brand
- [2026-02-25] Self-hosted Docker on Proxmox — full control, no recurring SaaS costs, fits existing infrastructure
- [2026-02-25] pnpm as package manager — fast, disk-efficient, widely used with Next.js
- [2026-02-25] NextAuth.js v5 over Supabase Auth — no vendor lock-in, native Next.js integration
- [2026-02-25] Vitest + Playwright for testing — fast unit tests, reliable E2E
- [2026-02-25] Calculator is Phase 1 MVP — core value prop, useful standalone before other features
