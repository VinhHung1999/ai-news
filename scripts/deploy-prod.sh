#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_DIR="/Users/hungphu/deployments/prod/ai-news-api"

echo "=== AI News: Production Deploy ==="
echo "Project: $PROJECT_DIR"
echo "Deploy:  $DEPLOY_DIR"
echo ""

# Step 1: Build backend + frontend
echo "[1/4] Building backend + frontend..."
cd "$PROJECT_DIR/backend"
npm run build:full
echo "  Build complete."

# Step 2: Deploy via CLI (syncs dist/, deps, restarts PM2)
echo "[2/4] Running deploy CLI..."
deploy up ai-news-api --env prod

# Step 3: Sync files that deploy CLI misses
echo "[3/5] Syncing frontend bundle to deploy folder..."
rm -rf "$DEPLOY_DIR/frontend/dist"
cp -r "$PROJECT_DIR/backend/frontend/dist" "$DEPLOY_DIR/frontend/dist"

echo "[4/5] Syncing backend scripts..."
cp -r "$PROJECT_DIR/backend/scripts/" "$DEPLOY_DIR/scripts/"

# Step 5: Restart PM2 to pick up changes
echo "[5/5] Restarting PM2..."
pm2 restart ai-news-api

# Verify
BUNDLE=$(ls "$DEPLOY_DIR/frontend/dist/assets/"*.js 2>/dev/null | head -1 | xargs basename)
echo ""
echo "=== Deploy Complete ==="
echo "Frontend bundle: $BUNDLE"
echo "Verify: https://ai-news.hungphu.work"
