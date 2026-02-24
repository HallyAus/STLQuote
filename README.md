# Claude Code Project Template

Reusable project structure for Claude Code with split memory system, Beads issue tracking, and session continuity. Drop into any new project.

## Structure

```
project/
├── CLAUDE.md                           ← routing file (under 150 lines)
├── .claude/
│   ├── settings.json                   ← hooks: context injection, file protection, learning detection
│   ├── commands/                       ← slash commands
│   │   ├── start-session.md            ← /start-session
│   │   ├── end-session.md              ← /end-session
│   │   ├── plan-feature.md             ← /plan-feature
│   │   ├── review.md                   ← /review
│   │   ├── status.md                   ← /status
│   │   └── reflect.md                  ← /reflect (capture learnings)
│   ├── rules/                          ← auto-loaded every session
│   │   ├── memory-profile.md           ← facts about the user
│   │   ├── memory-preferences.md       ← how user likes things done
│   │   ├── memory-decisions.md         ← past choices for consistency
│   │   ├── memory-sessions.md          ← rolling summary of recent work
│   │   └── memory-private.md           ← sensitive info (GITIGNORED)
│   ├── skills/                         ← progressive disclosure
│   │   ├── coding-patterns/SKILL.md
│   │   ├── testing/SKILL.md
│   │   ├── debugging/SKILL.md
│   │   └── documentation/SKILL.md
│   └── agents/
│       └── code-review.md
├── strategy/                           ← product planning
│   ├── [project]-prd.md                ← full PRD
│   ├── learnings.md                    ← project memory (gotchas, discoveries)
│   └── todo-list.md                    ← task tracking
├── specs/                              ← technical specs
│   ├── decisions.md                    ← ADR-style architecture log
│   └── bugs/                           ← bug reports
├── memory/                             ← session continuity
│   ├── HANDOFF.md                      ← state bridge between sessions
│   └── sessions/                       ← historical session logs
├── docs/architecture/                  ← system design docs
├── .beads/                             ← Beads issue tracker
├── .mcp.json                           ← MCP server config
├── .gitignore                          ← includes memory-private.md
└── setup.sh                            ← one-command init
```

## Key Design Principles

**CLAUDE.md is a router, not a knowledge dump.** Under 150 lines. Points to everything else.

**Split memory over single blob.** Four memory files in `.claude/rules/` (auto-loaded every session): profile, preferences, decisions, sessions. Plus a gitignored private file for sensitive info.

**Mandatory inline memory updates.** CLAUDE.md tells Claude to update memory files AS YOU GO, not at the end. The Stop hook pattern-matches for discoveries/fixes and reminds Claude to capture learnings.

**Beads for agent memory.** Steve Yegge's dependency-aware issue tracker replaces markdown TODO chaos. Agents query `bd ready` to know what to work on.

**Progressive disclosure.** Skills loaded on-demand, not crammed into CLAUDE.md. Architecture docs in `docs/`, decisions in `specs/`, learnings in `strategy/`.

## Quick Start

```bash
cp -r claude-code-template/* your-project/
cp -r claude-code-template/.* your-project/ 2>/dev/null
cd your-project
./setup.sh my-project-name
# Edit CLAUDE.md, strategy/prd, skills
claude
# /start-session
```

## Hooks

| Hook | When | What It Does |
|------|------|-------------|
| SessionStart | Session begins | Injects git status, HANDOFF.md, beads ready tasks |
| PreToolUse (Bash) | Before commands | Blocks dangerous commands (rm -rf, DROP TABLE) |
| PreToolUse (Edit) | Before file edits | Protects .env, secrets/ |
| Stop (learning) | Session ends | Detects fixes/discoveries, reminds to capture learnings |
| Stop (beads) | Session ends | Auto-exports beads state |

## Support

- ☕ [Buy me a coffee](https://buymeacoffee.com/printforge)
- 🛰️ [Free month of Starlink](https://www.starlink.com/referral) — Starlink high-speed internet is great for streaming
