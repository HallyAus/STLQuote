# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.
> The SessionStart hook auto-injects this into context.

## Last Updated

- **Date:** 2026-02-25 20:20
- **Branch:** main
- **Focus:** All 14 remaining features implemented (4 batches)

## Accomplished

- **This session — All 14 features across 4 batches**:
  - **Batch 1**: Email foundation (Nodemailer SMTP), password reset flow, email verification, send quote via email
  - **Batch 2**: PDF generation (@react-pdf/renderer), client portal (public quote view/accept/reject), duplicate quote
  - **Batch 3**: Weight-based stock deduction on job completion, revenue charts (Recharts), global search, job timeline, printer hours tracking
  - **Batch 4**: Batch pricing (configurable tiers), CSV export (quotes/clients/jobs), webhooks (HMAC-SHA256 signed)
- **Migrations**: 0003_auth_tokens, 0004_quote_portal_token, 0005_job_events, 0006_batch_pricing_webhooks
- **New deps**: nodemailer, @react-pdf/renderer, recharts
- **Prior sessions**: hardening, multi-file calculator, theme-aware UI, auth, admin portal, calculator, quotes, jobs kanban, settings, etc.

## In Progress

_None — all 14 planned features complete_

## Blocked

_None_

## Next Steps

1. First deploy with new migrations: `prisma migrate resolve --applied 0001_init` on existing DB
2. Configure SMTP env vars for email functionality
3. Testing pass — verify all features end-to-end
4. Version bump to 2.0.0

## Active Beads Issues

_Beads not yet configured_

## Context

- Project name: `printforge-quote`
- Version: 1.0.0 (needs bump)
- Deployed via GitHub Actions SSH to Proxmox VM Docker
- Node.js/pnpm not available in Claude Code env — can't run local builds
- Dark mode is default theme (workshop setting)
- Auth: NextAuth.js v5 with Credentials provider, JWT sessions
- Auth split: `auth.config.ts` (edge-safe) + `auth.ts` (Node.js with bcryptjs)
- Rate limiting: in-memory sliding window at `src/lib/rate-limit.ts`
- Calculator engine at `src/lib/calculator.ts` with tests — now includes batch pricing
- Email: Nodemailer at `src/lib/email.ts` — fire-and-forget, graceful degradation when SMTP not configured
- PDF: @react-pdf/renderer at `src/lib/pdf/quote-document.tsx`
- Webhooks: HMAC-SHA256 signed at `src/lib/webhooks.ts` — non-blocking via Promise.allSettled
- Client portal: public pages at `/portal/[token]` — no auth required, portalToken generated on first quote send
- Stock deduction: weight-based `Math.ceil(actualWeightG / spoolWeightG)` on job COMPLETE
- Revenue charts: Recharts at `src/components/dashboard/revenue-charts.tsx`
- Global search: `src/components/layout/global-search.tsx` — debounced, searches quotes/clients/jobs
- CSV export: `src/lib/csv.ts` — BOM for Excel, endpoints at `/api/export/[quotes|clients|jobs]`
- Batch pricing: configurable tiers in Settings as JSON, applied in calculator
- All API routes: zod validation, auth via getSessionUser(), try/catch with 500 handler, take: 500 safety cap
- Prisma migrations in `prisma/migrations/` (6 total), deployed via `migrate deploy`

## Files Modified This Session

### New Files
```
prisma/migrations/0003_auth_tokens/migration.sql
prisma/migrations/0004_quote_portal_token/migration.sql
prisma/migrations/0005_job_events/migration.sql
prisma/migrations/0006_batch_pricing_webhooks/migration.sql
src/lib/email.ts
src/lib/tokens.ts
src/lib/pdf/quote-document.tsx
src/lib/batch-pricing.ts
src/lib/webhooks.ts
src/lib/csv.ts
src/app/api/auth/forgot-password/route.ts
src/app/api/auth/reset-password/route.ts
src/app/api/auth/verify-email/route.ts
src/app/api/auth/resend-verification/route.ts
src/app/api/quotes/[id]/send/route.ts
src/app/api/quotes/[id]/pdf/route.ts
src/app/api/quotes/[id]/duplicate/route.ts
src/app/api/portal/[token]/route.ts
src/app/api/portal/[token]/respond/route.ts
src/app/api/search/route.ts
src/app/api/dashboard/revenue/route.ts
src/app/api/jobs/[id]/events/route.ts
src/app/api/export/quotes/route.ts
src/app/api/export/clients/route.ts
src/app/api/export/jobs/route.ts
src/app/api/webhooks/route.ts
src/app/api/webhooks/[id]/route.ts
src/app/api/webhooks/[id]/test/route.ts
src/app/(auth)/forgot-password/page.tsx
src/app/(auth)/reset-password/page.tsx
src/app/portal/[token]/page.tsx
src/components/layout/global-search.tsx
src/components/dashboard/revenue-charts.tsx
src/components/jobs/job-timeline.tsx
src/components/settings/webhook-settings.tsx
src/components/settings/batch-pricing-settings.tsx
```

### Modified Files
```
prisma/schema.prisma (PasswordResetToken, EmailVerificationToken, portalToken, JobEvent, materialId on Job, Webhook, batchPricingTiers)
package.json (@react-pdf/renderer, nodemailer, recharts, @types/nodemailer)
env.example (SMTP vars)
docker-compose.yml (SMTP comments)
src/middleware.ts (public paths for auth, portal)
src/app/api/auth/register/route.ts (send verification email)
src/app/(auth)/login/page.tsx (forgot password link, verified/reset banners)
src/components/quotes/quote-detail.tsx (Send, Duplicate, PDF buttons)
src/lib/calculator.ts (batch pricing integration)
src/app/api/settings/route.ts (batchPricingTiers field)
src/app/api/quotes/[id]/route.ts (fire webhooks on status change)
src/app/api/jobs/route.ts (materialId, JobEvent on create)
src/app/api/jobs/[id]/route.ts (stock deduction, printer hours, JobEvent, webhooks)
src/components/layout/header.tsx (GlobalSearch)
src/components/dashboard/dashboard-page.tsx (RevenueCharts)
src/components/settings/settings-page.tsx (BatchPricingSettings, WebhookSettings)
src/components/calculator/calculator-form.tsx (fetch batch tiers)
src/components/calculator/cost-breakdown.tsx (batch discount display)
src/components/quotes/quotes-page.tsx (Export CSV button)
src/components/clients/clients-page.tsx (Export CSV button)
src/components/jobs/jobs-page.tsx (materialId in modal, JobTimeline, Export CSV button)
```
