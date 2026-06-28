#!/usr/bin/env bash
# ==============================================================================
# LinkScout — Test Runner
# Exécute les tests Python (scraper) et TypeScript (frontend) en parallèle
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       LinkScout — Test Suite Runner      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Python tests (scraper) ────────────────────────────────────────────────
echo -e "${YELLOW}[1/4]🔍 Installing Python test deps...${NC}"
pip install -q -r "$ROOT_DIR/scraper/requirements-test.txt" 2>/dev/null || true

echo -e "${YELLOW}[2/4]🐍 Running Python tests (scraper)...${NC}"
cd "$ROOT_DIR/scraper"
PYTHONDONTWRITEBYTECODE=1 python -m pytest tests/ \
  -v \
  --tb=short \
  --cov=. \
  --cov-report=term-missing \
  --cov-report=html:coverage_html \
  -x \
  2>&1 | sed 's/^/  │ /'
PY_EXIT=${PIPESTATUS[0]}

echo ""
if [ $PY_EXIT -eq 0 ]; then
  echo -e "${GREEN}  ✅ Python tests PASSED${NC}"
else
  echo -e "${RED}  ❌ Python tests FAILED (exit=$PY_EXIT)${NC}"
fi

# ── 2. TypeScript / Vitest tests (frontend) ──────────────────────────────────
echo ""
echo -e "${YELLOW}[3/4]📦 Installing frontend deps if needed...${NC}"
cd "$ROOT_DIR/linkscout"
if [ ! -d "node_modules" ]; then
  npm install --silent 2>/dev/null || true
fi

echo -e "${YELLOW}[4/4]⚡ Running Vitest tests (frontend)...${NC}"
npx vitest run \
  --reporter=verbose \
  --coverage \
  2>&1 | sed 's/^/  │ /'
TS_EXIT=${PIPESTATUS[0]}

echo ""
if [ $TS_EXIT -eq 0 ]; then
  echo -e "${GREEN}  ✅ Frontend tests PASSED${NC}"
else
  echo -e "${RED}  ❌ Frontend tests FAILED (exit=$TS_EXIT)${NC}"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║            Test Suite Summary            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
if [ $PY_EXIT -eq 0 ] && [ $TS_EXIT -eq 0 ]; then
  echo -e "${GREEN}  ✅ ALL TESTS PASSED${NC}"
  exit 0
else
  echo -e "${RED}  ❌ Some tests failed${NC}"
  exit 1
fi
