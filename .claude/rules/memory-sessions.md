# Memory: Sessions

> Rolling summary of recent work. Claude adds entries after substantive work.
> Auto-loaded every session via `.claude/rules/`.
> Keep this to ~20 most recent entries. Archive older ones to `memory/sessions/`.

## Recent Sessions

<!-- Claude: add new entries at the top. Remove oldest when >20 entries. -->

- [2026-02-25] Built Materials library CRUD page: API routes (GET/POST at /api/materials, GET/PUT/DELETE at /api/materials/[id]) with Zod validation, dashboard page at /materials, client component with responsive table (desktop) and cards (mobile), add/edit modal, material type filter dropdown, stock status badges (in stock/low stock/out of stock), colour swatches for hex values, price-per-gram auto-calculation, dark mode support.
- [2026-02-25] Built Printers CRUD page: API routes (GET/POST at /api/printers, GET/PUT/DELETE at /api/printers/[id]) with Zod validation, dashboard page at /printers, client component with card grid, add/edit modal with live hourly rate preview, delete confirmation, responsive layout, dark mode support.
- [2026-02-25] Built Calculator MVP UI: created ui primitives (input, button, card), layout components (sidebar, header, dashboard layout), calculator form with all input sections (material, machine, labour, overhead, pricing), cost breakdown panel with bar chart visualisation. All client-side calculation, dark mode default, responsive two-column layout.
- [2026-02-25] Created GitHub Actions auto-deploy workflow (.github/workflows/deploy.yml) and deploy setup docs (deploy/README.md) — SSH-based deploy to self-hosted Docker VM on push to main
- [2026-02-25] Project kickoff: reviewed PRD for printforge-quote, confirmed stack (Next.js 15 + TypeScript + Prisma + PostgreSQL + pnpm, self-hosted Docker), scaffolded initial codebase, created architecture doc
