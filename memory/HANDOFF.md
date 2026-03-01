# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.
> The SessionStart hook auto-injects this into context.

## Last Updated

- **Date:** 2026-03-01 20:45
- **Branch:** main
- **Focus:** v5.18.0 — Learning Centre + Waitlist Removal + Roadmap Tier Badges

## Accomplished

- **This session — v5.17.1 → v5.18.0**:
  - **Waitlist Module Removal (v5.17.1)**:
    - Removed Waitlist model from schema.prisma + migration 0037_drop_waitlist
    - Removed 3 API routes (waitlist CRUD + approve/reject)
    - Removed waitlist page + form component
    - Removed admin-waitlist.tsx component + WaitlistEntry type
    - Cleaned up 3 remaining references: auth.ts OAuth callback, login-form.tsx error, landing page footer link
    - Removed unused imports (CheckCircle2 in register-form)
  - **Roadmap Tier Badges (v5.17.1)**:
    - Changed `pro?: boolean` to `tier?: "starter" | "pro" | "scale"` on RoadmapItem
    - Mapped all items to correct tiers from FEATURE_TIER in tier.ts
    - Colour-coded badges: blue (Starter), primary (Pro), amber (Scale)
    - Added 2 missing shipped features: Part Drawings (v5.8), Master Backup (v5.10)
  - **Learning Centre (v5.18.0)**:
    - `src/lib/learn-articles.ts` — 10 categories, 38 articles with full HTML content, search/filter helpers
    - 6 components in `src/components/learn/`: difficulty-badge, article-card, category-card, learn-search (client, URL param sync), table-of-contents (client, IntersectionObserver), article-feedback (client, localStorage)
    - `/learn` listing page — hero, category grid, searchable article grid with filters
    - `/learn/[slug]` detail page — breadcrumbs, two-column layout (article + sticky TOC), feedback widget, related articles, JSON-LD (BreadcrumbList + TechArticle)
    - `/learn/[slug]/opengraph-image.tsx` — dynamic OG images
    - Integration: middleware publicPaths, sitemap (40 new URLs), landing page nav+footer, blog nav, sidebar (BookOpen icon)
    - Build: 196 static pages (was 156), compiled successfully in 16.3s
- **Prior sessions**: v5.17.0 4-tier pricing, v5.16.x fixes, v5.15.x calculator redesign, v5.10.0 Master Backup, v5.8.0 Part Drawings, v5.3.0 Drip Emails, v5.2.0 Cloud Storage, v5.0.0 Design Studio

## In Progress

_None_

## Pending User Requests

1. **Roadmap filter**: Make status counts clickable to filter roadmap items
2. **Shopify email**: Custom Liquid email template for CRM launch announcement
3. **Stripe admin portal**: Fix Stripe for subscription collection in admin panel
4. **Landing page improvements**: User liked 3dprintdesk.com — consider further polish
5. **Don't push until Stripe sorted** — user said not to push 4-tier pricing until Stripe is configured

## Next Steps

1. Configure Stripe for 4-tier subscription collection
2. Deploy all pending versions (v5.17.0 → v5.18.0) once Stripe is ready
3. Continue with remaining pending user requests

## Context

- Version: 5.18.0
- App URL: crm.printforge.com.au
- Tiers: Hobby (free) / Starter ($12/mo) / Pro ($24/mo) / Scale ($49/mo), 14-day trial
- Learning Centre: 38 articles in 10 categories, public at /learn
- Cloud Storage: Pro feature, encrypted tokens (AES-256-GCM), Google Drive + OneDrive
- Backup: OneDrive only, SSE streaming, 1/hour rate limit, Scale tier
- Waitlist: Fully removed (model, routes, pages, references)
