Review changes on the current branch vs main.

Run `git diff main --name-only` then review each file for:
1. **Correctness** — does the logic work?
2. **Error handling** — errors handled, not swallowed?
3. **Testing** — tests for new/changed behaviour?
4. **Style** — matches `.claude/skills/coding-patterns/SKILL.md`?
5. **Security** — no hardcoded secrets, injection risks?
6. **Performance** — N+1 queries, unnecessary loops, memory leaks?

Format:
- ✅ What looks good
- ⚠️ Suggestions (non-blocking)
- ❌ Issues to fix before merge

Run tests and report results.
