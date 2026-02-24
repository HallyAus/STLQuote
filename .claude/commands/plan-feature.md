I want to plan a new feature. Help me break it down:

1. Ask me to describe the feature in plain language
2. Break it into a beads epic + subtasks:
   - Create parent epic: `bd create "[Feature Name]" -t epic -p [priority]`
   - Create child tasks for each piece of work
   - Set dependencies: `bd dep bd-CHILD bd-PARENT`
3. Estimate complexity for each task (S/M/L)
4. Identify risks or unknowns
5. If this involves architectural choices, add an entry to `specs/decisions.md`
6. Update `strategy/todo-list.md` with the new work
7. Show the full plan with `bd list --tree`
