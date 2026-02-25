# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.
> The SessionStart hook auto-injects this into context.

## Last Updated

- **Date:** 2026-02-25 12:10
- **Branch:** main
- **Focus:** Dashboard rework, stock control, dark mode fix (v0.8.0)

## Accomplished

- **v0.8.0**: Comprehensive dashboard with all business metrics, stock control, dark mode readability fix
  - Dashboard: 6 stat cards (quotes, revenue, this month, active jobs, clients, stock value), quote/job/stock breakdown cards with CSS status bars, recent quotes list, active jobs list, low stock alerts, quick actions
  - Stock control: POST `/api/materials/[id]/stock` endpoint for atomic adjustments; +/- buttons on materials page (desktop table + mobile cards); stock value column; total stock value in toolbar
  - Dark mode: proper surface layering (sidebar 0.14 → background 0.155 → cards 0.205), visible borders (0.30), better muted-foreground contrast (0.72)
  - Dashboard API expanded with job groupBy, active jobs, client count, printer utilisation, stock health metrics
- **v0.7.0**: Client-first quote flow, edit client on quote, convert accepted quote to job
- **v0.6.2**: Weight formula accounts for solid shells, default infill 15%
- **v0.6.1**: STL speed presets and weight formula accuracy fix
- Version display in header bar

## In Progress

_None_

## Blocked

_None_

## Next Steps

1. Authentication (NextAuth.js) — currently hardcoded `TEMP_USER_ID`
2. Settings page (business details, markup defaults, tax rates)
3. PDF quote generation / export
4. Print time estimation improvements (per-model calibration)
5. Printer management page enhancements
6. Job workflow (status transitions, timeline)

## Active Beads Issues

_Beads not yet configured_

## Context

- Project name: `printforge-quote`
- Version: 0.8.0
- Deployed via cron-based git pull + docker build on Proxmox VM (not GitHub Actions)
- Node.js/pnpm not available in Claude Code env — can't run local builds
- Dark mode is default theme (workshop setting)
- Multi-tenancy via `TEMP_USER_ID` on all tables (auth not yet implemented)
- Calculator engine at `src/lib/calculator.ts` with tests
- All API routes follow same pattern: zod validation, TEMP_USER_ID scoping, try/catch with 500 handler

## Files Modified This Session

```
package.json (version 0.8.0)
src/app/globals.css (dark mode colours)
src/app/api/dashboard/route.ts (expanded metrics)
src/app/api/materials/[id]/stock/route.ts (NEW - stock adjustment)
src/components/dashboard/dashboard-page.tsx (full rewrite)
src/components/materials/materials-page.tsx (stock controls)
```
