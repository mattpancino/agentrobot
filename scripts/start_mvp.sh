#!/usr/bin/env bash
# =====================================================================
# scripts/start_mvp.sh - Launch Project Sovereign-Stream MVP Server & UI
# =====================================================================
set -eo pipefail

cd "$(dirname "$0")/.."

echo "=== 1. Starting Mock Tier 3 Gemma Server on Port 8001 (Background) ==="
pkill -f "mock_gemma_server" || true
PYTHONPATH=. ./.venv/bin/uvicorn src.backend.mock_gemma_server:app --port 8001 --host 0.0.0.0 > mock_gemma.log 2>&1 &
echo "Mock Gemma vLLM Server started on port 8001 (PID: $!)"

echo "=== 2. Starting ADK Sovereign-Stream API Gateway & MVP UI on Port 8088 ==="
pkill -f "src.backend.main:app" || true
PYTHONPATH=. ./.venv/bin/uvicorn src.backend.main:app --port 8088 --host 0.0.0.0 > gateway.log 2>&1 &
GATEWAY_PID=$!

echo "Waiting for server to initialize..."
sleep 2

echo "====================================================================="
echo " SUCCESS: Project Sovereign-Stream MVP is Live & Ready!"
echo " Open your browser to test the interactive UI and Chaos Monkey controls:"
echo ""
echo "   http://elevateinstance.c.googlers.com:8088"
echo "   (or http://localhost:8088 on local machine)"
echo ""
echo " Server logs are being written to gateway.log"
echo "====================================================================="
