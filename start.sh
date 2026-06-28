#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== LinkScout - Démarrage ==="

# --- Backend Rust ---
echo ""
echo "[1/2] Build du backend Rust..."
cd "$ROOT_DIR/worker-rs"
cargo build --release 2>&1 | tail -1

echo "[2/2] Lancement du backend (port 8001)..."
kill $(lsof -t -i:8001) 2>/dev/null || true
sleep 0.5
./target/release/linkscout-worker &
WORKER_PID=$!

# --- Frontend Next.js ---
echo ""
echo "[3/3] Lancement du dashboard Next.js (port 3000)..."
cd "$ROOT_DIR/linkscout"
npm install --silent
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=== LinkScout prêt ==="
echo "  Dashboard : http://localhost:3000"
echo "  Backend   : http://localhost:8001"
echo "  Health    : http://localhost:8001/health"
echo ""
echo "Appuyez sur Ctrl+C pour tout arrêter."

trap "kill $WORKER_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
