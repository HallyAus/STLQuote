You are starting a brand new project. The template structure is already in place.

The user will describe their project idea. Your job is to bootstrap everything from that idea.

**Project Idea:**
$ARGUMENTS

---

## Steps

### 1. Understand the Idea
Parse the project idea above. If it's too vague to proceed, ask ONE clarifying question. Otherwise, move forward.

### 2. Name the Project
Suggest a short, kebab-case project name. Ask the user to confirm or rename.

### 3. Fill in CLAUDE.md
Update CLAUDE.md with:
- Project name and one-line description
- Best-guess stack (ask user to confirm)
- Key commands (dev server, test, lint, build) — use sensible defaults for the chosen stack
- Initial warnings/gotchas if any are obvious

### 4. Create the PRD
Rename `strategy/project-prd.md` to `strategy/[project-name]-prd.md` and fill in:
- Vision (2-3 sentences)
- Target users
- Core features (MVP vs V2)
- Technical requirements
- Non-goals
- Open questions

### 5. Set Up Beads
Create the initial epic and subtasks:
```bash
bd create "[Project Name] MVP" -t epic -p 1
```
Then create child tasks for each MVP feature identified in the PRD. Set dependencies where they exist.

### 6. Update Todo List
Fill in `strategy/todo-list.md` with the initial tasks matching the beads issues.

### 7. Update Memory
- Add a session entry to `.claude/rules/memory-sessions.md`: project kickoff, what was decided
- Add any decisions to `.claude/rules/memory-decisions.md` (stack choice, architecture approach)

### 8. Customise Skills
Update the skill files based on the chosen stack:
- `.claude/skills/coding-patterns/SKILL.md` — naming conventions, patterns for this stack
- `.claude/skills/testing/SKILL.md` — test framework and commands for this stack

### 9. Scaffold the Codebase
Create the initial project files:
- Appropriate config files for the stack (package.json, pyproject.toml, go.mod, etc.)
- Basic directory structure under `src/` or equivalent
- A minimal working entry point (hello world level — just enough to verify the stack works)
- `.env.example` if environment variables are needed

### 10. Architecture Doc
Fill in `docs/architecture/overview.md` with:
- System diagram (Mermaid)
- Key components
- External dependencies if any

### 11. Initial Commit
Stage everything and propose a commit:
```
feat: initial project scaffold for [project-name]
```
Ask user to confirm before committing.

### 12. Show Next Steps
Run `bd list --tree` to show the task breakdown, then suggest what to work on first.
