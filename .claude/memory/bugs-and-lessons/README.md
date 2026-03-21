# Bugs & Lessons Learned

## Resolved Bugs

### Star History collector returns 0 articles silently
- **Cause:** GitHub API rate limit (60 req/hour unauthenticated) → all `ghRes.ok` checks fail → `continue` skips silently → 0 articles
- **Fix:** Added fallback: when GitHub API returns 403, use basic info from star-history page instead of skipping

## Lessons Learned

### Always add fallback for GitHub API calls in collectors
- Unauthenticated GitHub API limit is 60 req/hour, easily hit during development
- Collectors making sequential API calls should never silently skip on failure
- Pattern: try GitHub API → if 403/rate limited → use basic info from original source

### PM2 prod silently stole port from dev server
- **Cause:** Dev and prod shared port 3342. `npm run dev` failed to bind, requests went to PM2 (prod DB)
- **Fix:** Separated ports — prod: 3342 (PM2), dev: 3343 (via `PORT` env var in `.env`)
- Lesson: always use different ports for dev vs prod
