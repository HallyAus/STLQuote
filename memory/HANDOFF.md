# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.
> The SessionStart hook auto-injects this into context.

## Last Updated

- **Date:** 2026-02-25 17:40
- **Branch:** main
- **Focus:** Feature-complete batch — v1.0.0

## Accomplished

- **v1.0.0**: Feature-complete release
  - **bcryptjs Edge Runtime fix**: Split `auth.config.ts` (edge-safe, no bcryptjs) from `auth.ts` (Node.js with Credentials provider). Middleware imports from `auth.config.ts` now.
  - **Admin create users**: POST `/api/admin/users` with bcrypt hashing + zod validation. Create User modal on admin page with name/email/password/role form.
  - **G-code parser**: `src/lib/gcode-parser.ts` extracts weight, time, material, layer height, temps from Bambu Studio/OrcaSlicer/PrusaSlicer/Cura G-code headers. Upload panel now accepts `.stl`, `.gcode`, `.gco`, `.g` files. G-code results show slicer metadata and auto-select matching material in calculator.
  - **Landing page**: Public marketing page at `/` with hero, features grid, how-it-works steps, self-hosted pitch, CTA. Middleware allows unauthenticated access to `/`.
  - **Database migrations**: Initial migration SQL in `prisma/migrations/0001_init/`. Dockerfile switched from `db push` to `migrate deploy`. Migration lock file created.
  - **Version bump**: 0.9.0 → 1.0.0
  - Clients nav already wired in sidebar (verified, no changes needed)
- **v0.9.0**: Auth, admin portal, calculator redesign, sidebar/header redesign, quotes PDF, jobs kanban, settings, presets
- **v0.8.0**: Dashboard, stock control, dark mode fix
- **v0.7.0**: Client-first quote flow, edit client on quote, convert accepted quote to job

## In Progress

_None_

## Blocked

_None_

## Next Steps

1. **First deploy with migrations**: Run `prisma migrate resolve --applied 0001_init` on existing DB (schema already matches), then future deploys use `migrate deploy` automatically
2. Print time estimation improvements (per-model calibration)
3. Printer management page enhancements (utilisation tracking)
4. Job workflow enhancements (timeline, notifications)
5. Email notifications (quote sent, job status changes)
6. Client portal (public quote view/accept)

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
- Calculator engine at `src/lib/calculator.ts` with tests
- G-code parser at `src/lib/gcode-parser.ts`
- All API routes: zod validation, auth via getSessionUser(), try/catch with 500 handler
- Prisma migrations in `prisma/migrations/`, deployed via `migrate deploy`

## Files Modified This Session

```
package.json (version 1.0.0)
src/lib/auth.config.ts (NEW — edge-safe auth config)
src/lib/auth.ts (refactored — imports from auth.config)
src/middleware.ts (imports from auth.config, public landing route)
src/lib/gcode-parser.ts (NEW — G-code metadata parser)
src/components/calculator/stl-upload-panel.tsx (G-code support, FileEstimates)
src/components/calculator/calculator-form.tsx (FileEstimates, G-code auto-fill)
src/app/api/admin/users/route.ts (POST create user endpoint)
src/app/(dashboard)/admin/page.tsx (Create User modal)
src/app/page.tsx (landing/marketing page)
Dockerfile (migrate deploy instead of db push)
prisma/migrations/0001_init/migration.sql (NEW)
prisma/migrations/migration_lock.toml (NEW)
```
