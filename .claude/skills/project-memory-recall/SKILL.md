---
name: Project Memory Recall
description: Read project memory from .claude/memory/ before starting complex tasks. Use when user says "--project-recall" or when starting work that might benefit from past context. Skip for trivial tasks.
---

# Project Memory Recall

**Purpose**: Read context from `.claude/memory/` to avoid repeating past mistakes and leverage existing knowledge.

## Memory Files

| File | When to read |
|------|-------------|
| `bugs-and-lessons/README.md` | Debugging, or before modifying areas with past issues |
| `design-decisions/README.md` | About to change UI/UX, need to know why current design exists |
| `api-design/README.md` | Designing new endpoints, changing API behavior |
| `data-model/README.md` | Changing schema, adding models, debugging queries |
| `architecture/README.md` | Major refactoring, adding new modules, onboarding |
| `deployment/README.md` | Deploying, changing infrastructure, debugging CI |

## Decision Criteria: Recall or Skip?

| Task | Action |
|------|--------|
| Implementing a new feature | **Recall** relevant topic |
| Making a significant technical decision | **Recall** decisions |
| Fixing a bug in an area that had past bugs | **Recall** bugs-and-lessons |
| Fixing a typo | **Skip** |
| Simple 1-line change | **Skip** |

## Workflow

1. Identify the upcoming task
2. Pick the relevant memory file(s) — usually just 1-2
3. Read the file
4. Look for:
   - Past decisions that constrain current work
   - Bugs that happened in the same area
   - Patterns/conventions already established
5. Apply context to the task

## Rules

- **Only read relevant files** — don't read all files for every task
- **Skip for simple tasks** — fixing a typo doesn't need recall
- **CLAUDE.md is always preloaded** — no need to read it again
- **Trust but verify** — memory entries may be outdated if code changed since they were written
