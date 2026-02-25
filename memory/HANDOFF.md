# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.
> The SessionStart hook auto-injects this into context.

## Last Updated

- **Date:** 2026-02-25 19:30
- **Branch:** main
- **Focus:** Public release hardening + multi-file calculator

## Accomplished

- **Hardening batch (this session)**:
  - Rate limiting on auth routes (`src/lib/rate-limit.ts` — in-memory sliding window, 5/15min register, 10/15min login)
  - Debug panel disabled in production (NODE_ENV guard in dashboard layout)
  - Removed `prisma/seed-user.mjs` and Dockerfile reference
  - Pagination safety caps (take: 500) on quotes/clients/materials/printers/jobs API routes
  - Security headers in `next.config.ts` (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control)
  - SEO metadata in layout.tsx (OG tags, metadataBase), landing page metadata, robots.txt, sitemap.ts
- **Multi-file calculator upload**: STL upload panel now supports multiple files. Drop zone always visible, compact file list with per-file type badge/weight/time/remove. STL controls recalculate all STL files. Calculator form serialises multi-file as `{ items: [...] }` to sessionStorage. New quote page handles both array and legacy single format.
- **Weight rounding**: STL parser and G-code parser now round weightG to 0.1g
- **Prior sessions**: theme-aware UI overhaul, Cloudflare domain config, last login tracking, admin reset password
- **v1.0.0**: Feature-complete release (see prior sessions)
- **v0.9.0**: Auth, admin portal, calculator redesign, sidebar/header redesign, quotes PDF, jobs kanban, settings, presets
- **v0.8.0**: Dashboard, stock control, dark mode fix
- **v0.7.0**: Client-first quote flow, edit client on quote, convert accepted quote to job

## In Progress

_None_

## Blocked

_None_

## Next Steps

1. **Remaining feature tiers** from public release plan:
   - Tier 1 Ship-blocking: email quotes (Nodemailer SMTP), PDF export (@react-pdf/renderer), password reset flow, email verification
   - Tier 2 High-value: client portal, auto-deduct stock, revenue charts, duplicate quote, global search
   - Tier 3 Quality of life: batch pricing, job timeline, printer utilisation, CSV export, webhooks
2. First deploy with migrations: `prisma migrate resolve --applied 0001_init` on existing DB

## Active Beads Issues

_Beads not yet configured_

## Context

- Project name: `printforge-quote`
- Version: 1.0.0
- Deployed via GitHub Actions SSH to Proxmox VM Docker
- Node.js/pnpm not available in Claude Code env — can't run local builds
- Dark mode is default theme (workshop setting)
- Auth: NextAuth.js v5 with Credentials provider, JWT sessions
- Auth split: `auth.config.ts` (edge-safe) + `auth.ts` (Node.js with bcryptjs)
- Rate limiting: in-memory sliding window at `src/lib/rate-limit.ts`
- Calculator engine at `src/lib/calculator.ts` with tests
- G-code parser at `src/lib/gcode-parser.ts`
- Multi-file upload: STL upload panel supports arrays, sessionStorage format `{ items: [...] }`
- All API routes: zod validation, auth via getSessionUser(), try/catch with 500 handler, take: 500 safety cap
- Prisma migrations in `prisma/migrations/`, deployed via `migrate deploy`
- Security headers configured in `next.config.ts`
- SEO: metadataBase, OG tags, robots.txt, sitemap.ts

## Files Modified This Session

```
src/lib/rate-limit.ts (NEW — in-memory sliding window rate limiter)
src/app/api/auth/register/route.ts (rate limiting)
src/app/api/auth/[...nextauth]/route.ts (rate limiting)
src/app/(dashboard)/layout.tsx (debug panel production guard)
prisma/seed-user.mjs (DELETED)
Dockerfile (removed seed-user reference)
src/app/api/quotes/route.ts (take: 500)
src/app/api/clients/route.ts (take: 500)
src/app/api/materials/route.ts (take: 500)
src/app/api/printers/route.ts (take: 500)
src/app/api/jobs/route.ts (take: 500)
next.config.ts (security headers)
src/app/layout.tsx (SEO metadata, OG tags, metadataBase)
src/app/page.tsx (page-specific metadata)
public/robots.txt (NEW)
src/app/sitemap.ts (NEW)
src/components/calculator/stl-upload-panel.tsx (multi-file rewrite)
src/components/calculator/calculator-form.tsx (multi-file support)
src/components/calculator/cost-breakdown.tsx (fileCount prop, button text)
src/components/quotes/new-quote.tsx (multi-item from calculator)
src/lib/stl-parser.ts (weight rounding to 0.1g)
src/lib/gcode-parser.ts (weight rounding to 0.1g)
```
