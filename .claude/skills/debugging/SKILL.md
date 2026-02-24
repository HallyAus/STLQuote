---
name: debugging
description: Debugging workflow and common issues. Load when troubleshooting.
---

# Debugging

## Workflow

1. **Reproduce** — trigger consistently
2. **Isolate** — minimal reproduction
3. **Diagnose** — read errors, check logs, add debug output
4. **Fix** — smallest change that resolves it
5. **Verify** — confirm fix, check regressions
6. **Document** — update beads issue + `strategy/learnings.md`

## Known Gotchas

> Add project-specific gotchas here as discovered

- [e.g., ModuleNotFoundError = virtualenv not activated]
- [e.g., CORS errors in dev = restart proxy]

## Debug Commands

```bash
[e.g., tail -f logs/app.log]
[e.g., docker logs -f container_name]
```

## When Stuck

1. Check `memory/HANDOFF.md` for known issues
2. Check `strategy/learnings.md` for past discoveries
3. Run `bd list --label bug` for related beads issues
4. Search git: `git log --grep="keyword"`
