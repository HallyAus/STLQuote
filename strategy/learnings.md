# Project Learnings

> Things discovered during development. Gotchas, workarounds, and non-obvious knowledge.
> Claude updates this when discoveries are made (see CLAUDE.md mandatory memory rules).

## Format

Each entry: `[YYYY-MM-DD] Learning — Context`

## Learnings

<!-- Claude: add new entries at the top -->

- [2026-02-25] Prisma enums are strict — when using enum fields in `where` clauses (e.g. `status: { in: [...] }`), the array MUST be typed with the Prisma-generated enum type (e.g. `JobStatus[]`), not `string[]`. TypeScript will pass locally but `next build` strict checking will fail. Always `import { EnumName } from "@prisma/client"` and type arrays accordingly.
- [2026-02-25] No local Node.js/pnpm available in Claude Code env on this machine — cannot run `pnpm build` to catch type errors before pushing. Must be extra careful with types, especially Prisma enum compatibility. Always import and use Prisma-generated types for enum fields.
