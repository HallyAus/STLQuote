# Memory: Decisions

> Past choices made during this project for consistency. Dated entries.
> Claude adds here when a decision is made. Auto-loaded every session.

## Format

Each entry: `[YYYY-MM-DD] Decision — Rationale`

## Decisions

<!-- Claude: add new entries at the top -->

- [2026-02-26] Three-tier role system: SUPER_ADMIN > ADMIN > USER — SUPER_ADMIN (ADMIN_EMAIL) is undeletable/unmodifiable, only SUPER_ADMIN can promote/demote ADMINs, both ADMIN and SUPER_ADMIN access admin portal. Role is a plain string column, no enum migration needed.
- [2026-02-26] Email provider: Resend SDK (not Nodemailer) — lazy-init pattern to avoid Docker build crash, domain verified at printforge.com.au
- [2026-02-25] Auth config split pattern: auth.config.ts (edge-safe, no bcryptjs) + auth.ts (Node.js with Credentials) — standard NextAuth v5 pattern to avoid Edge Runtime warnings in middleware
- [2026-02-25] G-code parser reads comment lines only, supports Bambu Studio/OrcaSlicer/PrusaSlicer/Cura — covers Daniel's Bambu Lab fleet and common community slicers
- [2026-02-25] Prisma migrate deploy in Dockerfile instead of db push — production-safe schema changes with tracked migration history
- [2026-02-25] Landing page at / is public (no auth) — middleware explicitly allows unauthenticated access to root path
- [2026-02-25] GitHub Actions deploy uses appleboy/ssh-action@v1 with concurrency group — simple, no Docker registry needed, cancel-in-progress disabled to avoid partial deploys
- [2026-02-25] Project name: printforge-quote — ties to Printforge brand
- [2026-02-25] Self-hosted Docker on Proxmox — full control, no recurring SaaS costs, fits existing infrastructure
- [2026-02-25] pnpm as package manager — fast, disk-efficient, widely used with Next.js
- [2026-02-25] NextAuth.js v5 over Supabase Auth — no vendor lock-in, native Next.js integration
- [2026-02-25] Vitest + Playwright for testing — fast unit tests, reliable E2E
- [2026-02-25] Calculator is Phase 1 MVP — core value prop, useful standalone before other features
