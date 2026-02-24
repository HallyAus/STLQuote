# Project: Printforge Quote

> 3D print cost calculator and business management platform for Printforge — stop guessing your 3D print costs.

## Owner

Daniel — Printforge (printforge.com.au) — Linux / Proxmox / Docker

## Quick Reference

| Need | Location |
|------|----------|
| Full PRD / product spec | `strategy/printforge-quote-prd.md` |
| Project memory & learnings | `strategy/learnings.md` |
| Task tracking | `strategy/todo-list.md` |
| Architecture decisions | `specs/decisions.md` |
| Known bugs | `specs/bugs/` |
| My profile & preferences | `.claude/rules/memory-*.md` (auto-loaded) |
| Coding patterns | `.claude/skills/coding-patterns/SKILL.md` |
| Testing approach | `.claude/skills/testing/SKILL.md` |
| Debugging playbook | `.claude/skills/debugging/SKILL.md` |
| Documentation standards | `.claude/skills/documentation/SKILL.md` |
| Session handoff state | `memory/HANDOFF.md` |

## Stack

- **Runtime:** Node 20 / TypeScript
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Database:** PostgreSQL (self-hosted via Docker)
- **ORM:** Prisma
- **Auth:** NextAuth.js v5 (Auth.js)
- **PDF:** @react-pdf/renderer
- **Email:** Nodemailer (SMTP)
- **Package Manager:** pnpm
- **Deployment:** Docker (Proxmox)

## Commands

```bash
pnpm dev          # dev server (http://localhost:3000)
pnpm build        # production build
pnpm start        # start production server
pnpm lint         # lint with ESLint
pnpm test         # run tests (Vitest)
pnpm test:e2e     # run E2E tests (Playwright)
pnpm db:push      # push Prisma schema to DB
pnpm db:migrate   # run Prisma migrations
pnpm db:studio    # open Prisma Studio
pnpm db:seed      # seed database
```

## Beads (Agent Memory / Issue Tracking)

```bash
bd list                        # all open issues
bd ready --json                # next actionable task
bd create "description" -p 1   # create P1 issue
bd close bd-XXXX               # close completed issue
```

## Workflow

1. **Session start:** Read `memory/HANDOFF.md`, run `bd ready --json`
2. **Before coding:** Read relevant skill in `.claude/skills/`
3. **During work:** Update memory files AS YOU GO (see below)
4. **After changes:** Run tests, update beads
5. **Session end:** Update `memory/HANDOFF.md`, commit

## Commit Format

`type(scope): description (bd-XXXX)`
Types: feat, fix, refactor, docs, test, chore

## Key Warnings

- ⚠️ Calculator must feel instant — no loading spinners for cost calculations (client-side compute)
- ⚠️ All prices AUD by default, metric units (grams, mm)
- ⚠️ Multi-tenancy: user_id on every table from day one
- ⚠️ Never modify Prisma migration files directly — generate new migrations
- ⚠️ Always update HANDOFF.md before ending a session
- ⚠️ Always include beads issue ID in commit messages

---

### Auto-Update Memory (MANDATORY)

**Update memory files AS YOU GO, not at the end.** When you learn something new, update immediately.

| Trigger | Action |
|---------|--------|
| User shares a fact about themselves | → Update `.claude/rules/memory-profile.md` |
| User states a preference | → Update `.claude/rules/memory-preferences.md` |
| A decision is made | → Update `.claude/rules/memory-decisions.md` with date |
| Completing substantive work | → Add to `.claude/rules/memory-sessions.md` |
| Discovery, gotcha, or workaround | → Add to `strategy/learnings.md` |
| Bug found | → Create file in `specs/bugs/` |
| Architecture decision | → Add entry to `specs/decisions.md` |

**Skip:** Quick factual questions, trivial tasks with no new info.

**DO NOT ASK. Just update the files when you learn something.**

---

### Progressive Disclosure

Do NOT read everything upfront. Load context as needed:
- Product questions → `strategy/printforge-quote-prd.md`
- Architecture → `specs/decisions.md`
- Coding how-to → `.claude/skills/[topic]/SKILL.md`
- Current priorities → `bd ready --json`
- Where we left off → `memory/HANDOFF.md`
- What we've learned → `strategy/learnings.md`
