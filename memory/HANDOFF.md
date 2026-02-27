# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.
> The SessionStart hook auto-injects this into context.

## Last Updated

- **Date:** 2026-02-27 21:05
- **Branch:** main
- **Focus:** v4.15.0 — Mobile Nav Fix + Admin Seed Data + 2FA + Upload Error Handling

## Accomplished

- **This session — v4.15.0**:
  - **Mobile nav fix**: Changed landing, blog listing, and blog post pages from `sticky top-0` to `fixed top-0 left-0 right-0` for reliable mobile scrolling. Added top padding to content below.
  - **Admin seed script**: Created `prisma/seed.ts` — generates 8 demo users, 30 quotes with line items, ~12 jobs, 25 system logs, 5 clients across last 30-45 days. Idempotent (checks for `demo+` prefix emails). Run with `pnpm db:seed`.
  - **Optional 2FA (TOTP)**: Full implementation:
    - Prisma schema: `totpSecret`, `totpEnabled`, `totpBackupCodes` on User model
    - Migration: `0025_user_totp`
    - 5 API routes: `/api/auth/2fa/{setup,enable,disable,verify,backup-codes}`
    - Verify page: `/verify-2fa` — 6-digit PIN entry with paste support, backup code fallback
    - Account page: "Two-Factor Authentication" card with enable/disable/setup/backup code UI
    - Auth integration: `requiresTwoFactor` flag in JWT token, middleware redirects to `/verify-2fa`
    - Cookie-based verification: `__2fa_verified` HttpOnly cookie signals completion to middleware
    - Dependencies: `otpauth`, `qrcode`, `@types/qrcode`
  - **Upload error handling**: Improved `/api/upload/[token]` with specific error messages for mkdir failure, permission issues, file read errors, and write failures (was generic "Failed to process upload")
  - **Version bump**: 4.14.0 → 4.15.0
- **Prior session — v4.14.0**: Admin portal redo (6 sub-components), analytics API, landing calculator demo, shipping costs, blog (20 posts), test fixes
- **Prior**: v4.13.0 (settings redesign, sticky headers, calculator embed, upload links), v4.11.0 (UI polish), earlier versions

## In Progress

- Need to commit and push all changes from this session

## Pending User Requests

1. **Upload error investigation**: User got "Failed to process upload" on production — improved error handling deployed but root cause may be Docker filesystem permissions. Check server logs after deploy.
2. **Roadmap filter**: Make status counts clickable to filter roadmap items
3. **Shopify email**: Custom Liquid email template for CRM launch announcement
4. **Stripe admin portal**: Fix Stripe for subscription collection in admin panel
5. **Landing page improvements**: User liked 3dprintdesk.com — consider further polish

## Next Steps

1. Commit and push all changes
2. Deploy — migration 0025 will add TOTP fields to User table
3. Run `pnpm db:seed` on production to populate admin dashboard charts
4. Check server logs for upload error details after deploy
5. Test 2FA flow end-to-end (enable, login, disable)

## Context

- Version: 4.15.0
- App URL: crm.printforge.com.au
- Tiers: Free / Pro ($29/mo, $290/yr), 14-day trial; admins always Pro
- 2FA: TOTP via `otpauth` library, QR via `qrcode`, cookie-based verification gate
- Upload links: public pages at `/upload/[token]`, files stored at `uploads/quote-requests/{userId}/`
- Blog: static data in `src/lib/blog-posts.ts`, public at `/blog` and `/blog/[slug]`
- Admin tabs: Overview, Users, Waitlist, System, Email, Billing
- Seed script: `prisma/seed.ts` — creates demo data for admin dashboard charts
- Env vars needed: `ANTHROPIC_API_KEY`, Xero/Stripe env vars on production
