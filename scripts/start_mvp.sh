#!/usr/bin/env bash
# =====================================================================
# scripts/start_mvp.sh - Launch Project Sovereign-Stream MVP Server & UI
# =====================================================================
set -eo pipefail

cd "$(dirname "$0")/.."

echo "=== 1. Cleaning up any legacy mock servers & stale tunnels on port 8001 ==="
pkill -f "mock_gemma_server" || true
pkill -f "start-iap-tunnel.*8001" || true

if [[ "$1" == "--mock" || "$1" == "--mock-tier3" ]]; then
    echo "Starting Mock Tier 3 Gemma Server on Port 8001 (Offline Mock Mode)..."
    nohup ./.venv/bin/uvicorn src.backend.mock_gemma_server:app --port 8001 --host 0.0.0.0 > mock_gemma.log 2>&1 &
    echo "Mock Gemma vLLM Server started on port 8001 (PID: $!)"
else
    echo "Port 8001 reserved for Live Sovereign GCE VM (via IAP tunnel)."
fi

echo "=== 2. Starting Sovereign PII Tokenizer Microservice on Port 8002 (Background) ==="
pkill -f "src.services.pii_tokenizer.main:app" || true
nohup ./.venv/bin/uvicorn src.services.pii_tokenizer.main:app --port 8002 --host 0.0.0.0 > pii_tokenizer.log 2>&1 &
echo "Sovereign PII Tokenizer Microservice started on port 8002 (PID: $!)"

echo "=== 3. Starting ADK Sovereign-Stream API Gateway & MVP UI on Port 8088 ==="
pkill -f "src.backend.main:app" || true
nohup ./.venv/bin/uvicorn src.backend.main:app --port 8088 --host 0.0.0.0 > gateway.log 2>&1 &
GATEWAY_PID=$!

disown -a

echo "Waiting for servers to initialize..."
sleep 2

echo "====================================================================="
echo " SUCCESS: Project Sovereign-Stream MVP is Live & Ready!"
echo " Open your browser to test the interactive UI and Chaos Monkey controls:"
echo ""
echo "   http://elevateinstance.c.googlers.com:8088"
echo "   (or http://localhost:8088 on local machine)"
echo ""
echo " Microservices Running:"
echo "   • Sovereign-Stream Gateway & UI:  http://localhost:8088"
echo "   • Sovereign PII Tokenizer Engine: http://localhost:8002 (/health, /v1/tokenize)"
echo "   • Live Tier 3 Sovereign Enclave:  sovereign-gemma-2b-vm (via IAP Tunnel on 8001)"
echo "====================================================================="
