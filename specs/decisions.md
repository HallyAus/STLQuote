# Architecture Decisions

> ADR-style log of significant technical decisions. Claude adds entries when decisions are made.

## Format

```
### ADR-[N]: [Title] — [YYYY-MM-DD]
**Status:** Accepted | Superseded | Deprecated
**Context:** [Why this decision was needed]
**Decision:** [What was chosen]
**Consequences:** [Trade-offs and follow-up work]
```

## Decisions

<!-- Claude: add new entries at the top with incrementing ADR number -->

### ADR-004: Vitest + Playwright for Testing — 2026-02-25

**Status:** Accepted

**Context:** Need a test framework that works well with Next.js and TypeScript.

**Decision:** Vitest for unit/integration tests (fast, native ESM/TS support, Jest-compatible API). Playwright for E2E testing (cross-browser, reliable, good Next.js integration).

**Consequences:** Need to configure Vitest with React Testing Library for component tests. Playwright requires a running dev server for E2E tests.

### ADR-003: NextAuth.js v5 (Auth.js) for Authentication — 2026-02-25

**Status:** Accepted

**Context:** Need auth for multi-tenant SaaS. Options: Supabase Auth, NextAuth.js, custom.

**Decision:** NextAuth.js v5 (Auth.js) — integrates natively with Next.js App Router, supports multiple providers, works with Prisma adapter for self-hosted DB.

**Consequences:** No vendor lock-in. Can add OAuth providers (Google, GitHub) later. Email/password via Credentials provider for MVP.

### ADR-002: Self-hosted Docker on Proxmox — 2026-02-25

**Status:** Accepted

**Context:** Need hosting for the app and database. Options: Vercel + Supabase, self-hosted Docker.

**Decision:** Self-hosted Docker on Daniel's existing Proxmox infrastructure. PostgreSQL in Docker alongside the Next.js app. Full control, no recurring SaaS costs, fits existing ops workflow.

**Consequences:** Need Docker Compose setup. Responsible for own backups and updates. Can use Cloudflare Tunnels for public access.

### ADR-001: Next.js 15 + TypeScript + Prisma + PostgreSQL Stack — 2026-02-25

**Status:** Accepted

**Context:** Starting a new 3D print quoting SaaS. Need a modern, full-stack framework that supports SSR, API routes, and good developer experience.

**Decision:** Next.js 15 (App Router) with TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS + shadcn/ui, pnpm. This is a well-supported, production-ready stack with strong community.

**Consequences:** TypeScript adds compile-time safety. Prisma provides type-safe DB queries. shadcn/ui gives high-quality, customisable components. pnpm is fast and disk-efficient.
