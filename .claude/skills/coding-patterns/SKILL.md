---
name: coding-patterns
description: Project-specific coding patterns and conventions. Load when writing, refactoring, or reviewing code.
---

# Coding Patterns — Printforge Quote

## Stack

Next.js 15 (App Router) + TypeScript + Prisma + PostgreSQL + Tailwind CSS + shadcn/ui

## File Organisation

- Group by feature, not by type
- Keep files under 300 lines where practical
- One component per file
- Colocate tests: `component.tsx` → `component.test.tsx`

## Directory Structure

```
src/
  app/                    # Next.js App Router pages
    (auth)/               # Auth route group (login, register)
    (dashboard)/          # Authenticated route group
      calculator/         # Calculator page
      settings/           # Settings page
      layout.tsx          # Dashboard layout with sidebar
    api/                  # API routes
    layout.tsx            # Root layout
    page.tsx              # Landing/redirect
  components/
    ui/                   # shadcn/ui components
    [feature]/            # Feature-specific components
  lib/
    prisma.ts             # Prisma client singleton
    auth.ts               # NextAuth config
    utils.ts              # Shared utilities
    calculator.ts         # Calculator engine (pure functions)
  types/                  # Shared TypeScript types
prisma/
  schema.prisma           # Database schema
  migrations/             # Generated migrations
  seed.ts                 # Seed script
```

## Naming

- **Files:** `kebab-case.ts` / `kebab-case.tsx`
- **Components:** `PascalCase` (matches filename but PascalCase export)
- **Functions:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **DB tables:** `PascalCase` (Prisma convention, maps to snake_case in SQL)
- **Types/Interfaces:** `PascalCase`, no `I` prefix

## React / Next.js Patterns

- Server Components by default, `"use client"` only when needed
- Server Actions for mutations where appropriate
- Use `loading.tsx` and `error.tsx` for route-level states
- Validate inputs with Zod schemas
- Use React Hook Form for complex forms

## Prisma Patterns

- Single Prisma client instance via `lib/prisma.ts`
- Always filter by `userId` for multi-tenancy
- Use Prisma transactions for multi-table writes
- Generate migrations with `pnpm db:migrate`

## Calculator Engine

- Pure functions in `lib/calculator.ts` — no side effects
- All calculations happen client-side for instant feedback
- Accept a typed config object, return a typed result object
- Individual cost functions: `calculateMaterialCost()`, `calculateMachineCost()`, etc.
- Composing function: `calculateTotalCost()` that calls all sub-functions

## Error Handling

- Handle errors explicitly, never swallow silently
- Use Next.js error boundaries (`error.tsx`) for page-level errors
- API routes return consistent error shape: `{ error: string, details?: unknown }`
- Log with context (what was attempted, relevant IDs)

## Patterns We Avoid

- God components over 300 lines
- Global mutable state (use React state / server state)
- Magic numbers — use named constants (especially for calculator defaults)
- `any` type — use `unknown` and narrow
- Barrel exports (`index.ts` re-exporting everything)
