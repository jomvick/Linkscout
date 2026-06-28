#!/usr/bin/env bash
# ==============================================================================
# LinkScout — Watch Mode Test Runner (Fedora-optimized)
#
# Lance les tests en mode watch (surveillance de fichiers) en arrière-plan.
# Utilisation: ./start-tests-watch.sh [--python-only | --frontend-only]
#
# Pour exécuter en arrière-plan (daemon):
#   nohup ./start-tests-watch.sh > /tmp/linkscout-test.log 2>&1 &
#
# Pour tuer le daemon:
#   pkill -f "start-tests-watch"
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
MODE="${1:-all}"

echo "[LinkScout Watch] Starting test watcher (mode: $MODE)..."

cleanup() {
  echo ""
  echo "[LinkScout Watch] Shutting down..."
  if [ -n "${PY_PID:-}" ]; then kill "$PY_PID" 2>/dev/null || true; fi
  if [ -n "${TS_PID:-}" ]; then kill "$TS_PID" 2>/dev/null || true; fi
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── Python watcher (pytest-watch / ptw) ──────────────────────────────────────
if [ "$MODE" = "all" ] || [ "$MODE" = "--python-only" ]; then
  echo "[LinkScout Watch] Starting Python test watcher (ptw)..."
  cd "$ROOT_DIR/scraper"
  if command -v ptw &>/dev/null; then
    ptw tests/ -- --cov=. --cov-report=term --tb=short &
    PY_PID=$!
  else
    echo "  ⚠️  ptw not found. Install: pip install pytest-watch"
    echo "  → Falling back to one-shot pytest"
    python -m pytest tests/ -v --tb=short --cov=. &
    PY_PID=$!
  fi
fi

# ── TypeScript watcher (vitest) ──────────────────────────────────────────────
if [ "$MODE" = "all" ] || [ "$MODE" = "--frontend-only" ]; then
  echo "[LinkScout Watch] Starting Vitest watcher..."
  cd "$ROOT_DIR/linkscout"
  npx vitest --watch --reporter=verbose &
  TS_PID=$!
fi

# ── Attendre que les processus se terminent ──────────────────────────────────
wait
