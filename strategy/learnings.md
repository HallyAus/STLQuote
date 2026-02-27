# Project Learnings

> Things discovered during development. Gotchas, workarounds, and non-obvious knowledge.
> Claude updates this when discoveries are made (see CLAUDE.md mandatory memory rules).

## Format

Each entry: `[YYYY-MM-DD] Learning — Context`

## Learnings

<!-- Claude: add new entries at the top -->

- [2026-02-28] Windows symlink EPERM errors during `next build` standalone trace phase are not code issues — Windows requires elevated privileges for symlinks. Build compiles and type-checks fine; the error only affects the standalone output copy step.
- [2026-02-28] Anthropic SDK `image` content block requires literal union type for `media_type` — must cast string to `"image/jpeg" | "image/png" | "image/webp" | "image/gif"`, not pass a plain `string`.
- [2026-02-28] Prisma migration SQL can be written manually when no local DB is available — create the migration directory + `migration.sql` file. Prisma will pick it up on next `prisma migrate deploy`.

- [2026-02-27] Logger `log()` types are strictly `"xero_sync" | "email" | "billing" | "auth" | "system"` — no "security" type. Use "system" for admin/impersonation events, "auth" for 2FA/login events.
- [2026-02-27] Binary STL files can have up to 2 bytes padding after the calculated size (`80 + 4 + numTriangles * 50`) due to slicer alignment — allow `buffer.length <= expectedSize + 2` in validation.
- [2026-02-27] G-code MIME validation: semicolons (`;`) appear in many non-gcode files — never use `;` alone as a gcode indicator. Require actual G/M commands like `G0`, `G1`, `G28`, `M104`, `M140`.
- [2026-02-27] ASCII STL validation: just checking for "solid" prefix is insufficient — many text files start with "solid". Always require both "solid" header AND "endsolid" footer.

- [2026-02-25] Prisma enums are strict — when using enum fields in `where` clauses (e.g. `status: { in: [...] }`), the array MUST be typed with the Prisma-generated enum type (e.g. `JobStatus[]`), not `string[]`. TypeScript will pass locally but `next build` strict checking will fail. Always `import { EnumName } from "@prisma/client"` and type arrays accordingly.
- [2026-02-25] No local Node.js/pnpm available in Claude Code env on this machine — cannot run `pnpm build` to catch type errors before pushing. Must be extra careful with types, especially Prisma enum compatibility. Always import and use Prisma-generated types for enum fields.
