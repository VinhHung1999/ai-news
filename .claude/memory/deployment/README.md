# Deployment

Infrastructure, CI/CD, and deployment decisions. Read this before changing deployment processes.

## Infrastructure

### PM2 + Cloudflare Tunnel
- Backend serves both API and frontend static files from port 3342
- PM2 process name: `ai-news-api`
- PostgreSQL prod on port 5433, dev on port 5432 (`DB_PORT` env var)
- Cloudflare tunnel routes:
  - `ai-news.hungphu.work` → localhost:3342 (prod)
  - `dev-ai-news.hungphu.work` → localhost:5173 (dev Vite)
  - `api-ainews.hungphu.work` → localhost:3342 (API alias)

## Environment Configuration

### backend/.env (not committed)
- `XAI_API_KEY` — xAI grok API key for BuHu Assistant
- `APP_API_KEY` — API key for write endpoint auth (X-API-Key header)
- `DB_PORT` — PostgreSQL port (5433 prod, 5432 dev)
- Must use `dotenv.config({ override: true })` because system env may have stale keys

## Deployment Process

### Deploy command
```bash
deploy up ai-news-api --env prod
```
- Runs `npm run build:full` (backend tsc + frontend vite build + copy dist)
- Syncs to `~/deployments/prod/ai-news-api/`
- PM2 restart + health check
- Frontend dist must be at `{deployment}/frontend/dist/` relative to backend

### First-time setup
- PM2 process must be started manually first time: `pm2 start dist/server.js --name ai-news-api`
- Copy `.env` to deployment dir manually
- Create DB: `psql -p 5433 -d postgres -c "CREATE DATABASE ai_news;"`

### Rollback
```bash
deploy rollback ai-news-api --env prod
```
