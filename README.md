# Printforge Quote

**Stop guessing your 3D print costs.** Calculate material, machine, and labour costs, send professional quotes, manage inventory, and track jobs — all self-hosted on your own infrastructure.

Built for 3D printing businesses who want full control over their data without recurring SaaS fees.

## Features

- **Cost Calculator** — Real-time calculation factoring material, machine depreciation, electricity, labour, and overhead costs. Upload STL/G-code files for auto-fill.
- **Professional Quotes** — Generate branded PDF quotes, email them to clients with one click, and track accept/reject via a client portal.
- **Client Management** — CRM with contact details, tags, quote history, and notes.
- **Job Tracking** — Kanban board from queue to completion. Auto-deducts stock on job completion.
- **Inventory** — Track printers, materials, stock levels, and low-stock alerts.
- **Dashboard** — Revenue charts, conversion rates, pending quotes, and printer utilisation.
- **Admin Portal** — User management, role-based access (Super Admin / Admin / User), email logs, registration controls.
- **Global Search** — Search across quotes, clients, and jobs from the header.
- **CSV Export** — Export quotes, clients, and jobs for external reporting.
- **Webhooks** — HMAC-SHA256 signed webhooks for quote/job status changes.
- **Batch Pricing** — Configurable quantity discount tiers.
- **Dark Mode** — Default theme, designed for workshop environments.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Database:** PostgreSQL 16
- **ORM:** Prisma
- **Auth:** NextAuth.js v5 (JWT sessions, email/password)
- **PDF:** @react-pdf/renderer
- **Email:** Resend
- **Charts:** Recharts

## Quick Start

### Prerequisites

- Docker + Docker Compose
- A domain with DNS (for production)
- [Resend](https://resend.com) API key (for email)

### Deploy

```bash
git clone https://github.com/HallyAus/STLQuote.git
cd STLQuote

# Copy and configure environment
cp env.example .env
# Edit .env — set NEXTAUTH_SECRET, DATABASE_URL, RESEND_API_KEY, etc.

# Start
docker compose up -d
```

The app will be available at `http://localhost:3000`.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_URL` | App URL (e.g. `https://crm.yourdomain.com`) | Yes |
| `NEXTAUTH_SECRET` | Session encryption key — `openssl rand -base64 32` | Yes |
| `ADMIN_EMAIL` | Email that gets Super Admin role on registration | Yes |
| `NEXT_PUBLIC_APP_URL` | Public app URL (used in emails/links) | Yes |
| `RESEND_API_KEY` | Resend API key for sending emails | No* |
| `RESEND_FROM` | From address (e.g. `Printforge <noreply@yourdomain.com>`) | No |
| `RESEND_REPLY_TO` | Reply-to address for outgoing emails | No |

*Email features (quote sending, password reset, verification) require Resend.

### First Login

1. Register an account using the email set in `ADMIN_EMAIL`
2. You'll automatically be assigned the Super Admin role
3. Go to **Admin > Config** to toggle public registration on/off

## Development

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # production build
pnpm lint         # ESLint
pnpm test         # Vitest
pnpm db:migrate   # run Prisma migrations
pnpm db:studio    # open Prisma Studio
```

## Architecture

```
src/
  app/              # Next.js App Router pages + API routes
    (auth)/         # Login, register, forgot/reset password
    (dashboard)/    # All authenticated pages
    api/            # REST API endpoints
    portal/         # Public client quote portal
  components/       # React components by feature
  lib/              # Shared utilities (auth, email, calculator, etc.)
prisma/
  schema.prisma     # Database schema
  migrations/       # SQL migrations
```

## Deployment

Designed for self-hosted Docker on any Linux server. Ships with a multi-stage Dockerfile (non-root user, standalone output). Database migrations run automatically on container start.

For production behind a reverse proxy (Nginx, Cloudflare Tunnel, etc.), set `AUTH_TRUST_HOST=true` in your environment.

## Support

- [Report an issue](https://github.com/HallyAus/STLQuote/issues)
- ☕ [Buy me a coffee](https://buymeacoffee.com/printforge)
- 🛰️ [Free month of Starlink](https://www.starlink.com/referral) — Starlink high-speed internet is great for streaming

## Licence

MIT
