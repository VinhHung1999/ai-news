# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI News Hacker Dashboard — a hacker/terminal-themed web app that aggregates trending AI content from GitHub, Anthropic, Google AI, and Hacker News. Monorepo with a TypeScript backend and React + TypeScript frontend.

## Architecture

- **backend/src/** — Express.js + TypeScript server. Collectors fetch from 4 sources (GitHub Search API, Anthropic RSS, Google AI RSS, HN Algolia). Data stored in SQLite via better-sqlite3. Cron job runs daily at 5AM.
  - `src/types.ts` — Shared Article/ArticleRow/FormattedArticle interfaces
  - `src/db/database.ts` — SQLite connection, schema, query helpers
  - `src/collectors/` — One file per source (github.ts, anthropic.ts, google-ai.ts, hackernews.ts)
  - `src/services/collector-runner.ts` — Orchestrates all collectors in parallel
  - `src/server.ts` — Express API server
  - `src/cron.ts` — Cron scheduler + manual trigger
- **frontend/** — React 19 + TypeScript + Vite SPA. No router — state-driven view switching. Styled with plain CSS (`index.css`), hacker/terminal aesthetic. Uses framer-motion for animations and lucide-react for icons.

Frontend API base is dynamic: `localhost:3342` in dev, `api-ainews.hungphu.work` via tunnel.

## Commands

### Backend
```bash
cd backend && npm install
npm run dev              # tsx dev server on port 3342
npm run collect          # manual data collection (tsx src/cron.ts --now)
npm run cron             # start cron scheduler (5AM daily)
npm run typecheck        # tsc --noEmit
npm run build            # compile to dist/
```

### Frontend
```bash
cd frontend && npm install
npm run dev              # Vite dev server (port 5173)
npm run build            # tsc -b && vite build
npm run lint             # eslint
```

## Ports & Tunnel

| Service  | Local | Tunnel |
|----------|-------|--------|
| Backend  | 3342  | api-ainews.hungphu.work |
| Frontend | 5173  | ai-news.hungphu.work |

## Key Design Decisions

- All sources filtered to last 14 days only
- GitHub query: `"ai agent" OR "llm" OR "machine learning" created:>14d` sorted by stars
- HN: points>50 threshold, top 5 articles only, focused AI queries
- Deduplication by URL (UNIQUE constraint) — re-crawling same articles is safe
- RSS collectors (Anthropic, Google AI) fallback to latest 10 items if no recent posts
