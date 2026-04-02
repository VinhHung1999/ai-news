# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI News Hacker Dashboard — a hacker/terminal-themed web app that aggregates trending AI content from GitHub, Anthropic, Google AI, and Hacker News. Includes BuHu AI Assistant (xAI grok) for article summarization and chat. Chrome extension for saving articles.

## Architecture

- **backend/src/** — Express.js + TypeScript server. PostgreSQL database. Cron job (5AM daily) built into server.
  - `src/types.ts` — Shared Article/ArticleRow/FormattedArticle interfaces
  - `src/db/database.ts` — PostgreSQL pool, query helpers
  - `src/collectors/` — One file per source (github.ts, anthropic.ts, google-ai.ts, hackernews.ts)
  - `src/services/collector-runner.ts` — Orchestrates all collectors in parallel
  - `src/services/ai.ts` — xAI grok integration (summary + chat)
  - `src/services/content-fetcher.ts` — Jina Reader (URLs) + GitHub README + PDF/DOCX parsing
  - `src/server.ts` — Express API server + static frontend serving + cron
- **frontend/** — React 19 + TypeScript + Vite SPA. Styled with plain CSS (`index.css`), hacker/terminal aesthetic. framer-motion + lucide-react.
- **extension/** — Chrome extension: new tab override + save current page to AI News.

## Commands

### Backend
```bash
cd backend && npm install
npm run dev              # tsx dev server on port 3342
npm run collect          # manual data collection
npm run typecheck        # tsc --noEmit
npm run build            # compile to dist/
npm run build:full       # build backend + frontend together
```

### Frontend
```bash
cd frontend && npm install
npm run dev              # Vite dev server (port 5173)
npm run build            # tsc -b && vite build
npm run lint             # eslint
```

### Deploy
```bash
./scripts/deploy-prod.sh             # full deploy (build + sync frontend + PM2 restart)
deploy logs ai-news-api --env prod   # view logs
deploy rollback ai-news-api --env prod
```

> **Note:** Always use `scripts/deploy-prod.sh` instead of `deploy up` directly. The deploy CLI does not sync `frontend/dist` to the deploy folder — the script handles this.

## Ports & Tunnel

| Service  | Local | Tunnel |
|----------|-------|--------|
| Production (API + Frontend) | 3342 | ai-news.hungphu.work |
| Dev Frontend | 5173 | dev-ai-news.hungphu.work |
| API (alias) | 3342 | api-ainews.hungphu.work |

## Database

- PostgreSQL on port 5433 (prod) / 5432 (dev)
- DB name: `ai_news`
- `DB_PORT` env variable controls which instance

## Key Design Decisions

- All sources filtered to last 14 days only
- GitHub: fetch README.md directly from API (not Jina Reader)
- Anthropic: scrape news listing from anthropic.com/news (date + category + title)
- HN: points>50 threshold, top 5 articles only
- Deduplication by URL (UNIQUE constraint)
- BuHu AI uses xAI grok-4-1-fast-non-reasoning with shared system prompt for cache reuse
- API key auth on write endpoints (X-API-Key header)
- Frontend and API served from same Express server in production

## Tmux Team Workflow

Team workflow and sprint process: [`docs/tmux/ai-news/workflow.md`](docs/tmux/ai-news/workflow.md)
- 2-person team: PO + DEV
- Backlog/board managed via MCP tools (`list_backlog`, `get_board`, `get_my_tasks`, `update_task_status`, etc.)
- DEV must pull tasks (`get_my_tasks`) and update status throughout sprint execution

## Project Memory

Project memories are stored in `.claude/memory/`. Use `--project-recall` before complex tasks, `--project-store` after meaningful work.

| Topic | Content |
|-------|---------|
| [bugs-and-lessons](.claude/memory/bugs-and-lessons/README.md) | Bugs encountered and lessons learned |
| [design-decisions](.claude/memory/design-decisions/README.md) | UI/UX decisions, color palette, animation philosophy |
| [api-design](.claude/memory/api-design/README.md) | API endpoints, auth patterns, error handling |
| [data-model](.claude/memory/data-model/README.md) | Database schema, migrations |
| [architecture](.claude/memory/architecture/README.md) | System structure, module boundaries |
| [deployment](.claude/memory/deployment/README.md) | PM2, Cloudflare Tunnel, deploy CLI |
