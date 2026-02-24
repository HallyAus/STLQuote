---
name: testing
description: Testing patterns and requirements. Load when writing tests or validating changes.
---

# Testing — Printforge Quote

## Framework

- **Unit/Integration:** Vitest + React Testing Library
- **E2E:** Playwright
- **Schema validation:** Zod (tested alongside unit tests)

## Commands

```bash
pnpm test             # run all Vitest tests
pnpm test -- path     # specific file
pnpm test:coverage    # with coverage report
pnpm test:watch       # watch mode
pnpm test:e2e         # Playwright E2E tests
```

## Structure

- Tests live next to code: `calculator.ts` → `calculator.test.ts`
- Naming: `describe('[Module]') → it('should [expected behaviour] when [condition]')`
- Test data factories in `tests/factories/`

## Calculator Tests (Critical)

The calculator is the core feature. Test thoroughly:
- Each cost function individually (material, machine, labour, overhead)
- Edge cases: zero values, very large values, negative inputs
- Markup and minimum charge logic
- Quantity discount tiers
- Currency rounding (always round to 2 decimal places)
- Full cost breakdown matches sum of parts

## Component Tests

- Use React Testing Library — test behaviour, not implementation
- Mock API calls, test user interactions
- Test form validation and error states

## API Route Tests

- Test with Vitest — mock Prisma client
- Test auth middleware (unauthenticated → 401)
- Test multi-tenancy (can't access other user's data)

## Requirements

- All public functions must have tests
- Happy path + at least one error case
- Edge cases for data boundaries (especially calculator maths)
- Mock externals in unit tests, real deps in integration

## Before Closing a Beads Issue

1. All existing tests pass
2. New tests for new functionality
3. No coverage regressions
