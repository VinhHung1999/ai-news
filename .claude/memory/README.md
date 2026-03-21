# AI News Project Memory

This directory contains structured memories specific to the AI News project.

**How to use:** Start here. Only read deeper files when you need that specific context.

---

## Structure

```
memory/
├── README.md
├── bugs-and-lessons/
│   └── README.md
├── design-decisions/
│   └── README.md
├── api-design/
│   └── README.md
├── data-model/
│   └── README.md
├── architecture/
│   └── README.md
└── deployment/
    └── README.md
```

---

## Memory Format

Each README.md contains the overview. When a topic grows, split into separate files within the folder.

**Entry format:**
```markdown
### Short title
- What happened / what was decided
- Lesson learned or reason for decision
```

**Separate file format** (when splitting from README.md):
```markdown
# Title

**Tags:** #tag1 #tag2
**Created:** YYYY-MM-DD

---

## Description
One sentence summary.

## Content
3-5 sentences: what happened, what worked/failed, key lesson.
```

---

## When to Read Each Folder

| Folder | Read when... |
|--------|-------------|
| `bugs-and-lessons` | Debugging, or before modifying areas with past issues |
| `design-decisions` | About to change UI/UX, need to know why current design exists |
| `api-design` | Designing new endpoints, changing API behavior |
| `data-model` | Changing schema, adding models, debugging queries |
| `architecture` | Major refactoring, adding new modules, onboarding |
| `deployment` | Deploying, changing infrastructure, debugging CI |

---

## Adding New Memories

1. Determine which folder the memory belongs to
2. Read README.md in that folder first (avoid duplicates)
3. For small additions: append to README.md
4. For detailed entries: create a new `.md` file in the folder and link from README.md
5. Keep entries short: max 3-4 lines each
6. If new info contradicts old entry, update inline with "**Updated:**"

---

## Search

```bash
# Search all project memories
grep -r "keyword" .claude/memory/

# Search by topic
grep -r "keyword" .claude/memory/bugs-and-lessons/
```

---

## Relationship to CLAUDE.md

| Scope | Where |
|-------|-------|
| What you need to START working | `CLAUDE.md` |
| Deeper context, read WHEN needed | `.claude/memory/*/README.md` |
| Architecture changes, new commands | Update `CLAUDE.md` |
| Summaries, bugs, decisions, rationale | Update memory files only |

---

**Last Updated:** 2026-03-21
