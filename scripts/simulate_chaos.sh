#!/usr/bin/env bash
# =====================================================================
# scripts/simulate_chaos.sh - Trigger Mock Fault & Verify Sticky Failover
# =====================================================================
set -eo pipefail

API_URL="${1:-http://localhost:8088/api/chat}"
SESSION_ID="demo-session-$(date +%s)"

echo "=== Turn 1: Normal Query (Expect Tier 1 Global) ==="
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"message\": \"What are our key compliance obligations under APRA CPS 234?\",
    \"simulationControls\": { \"injectMockFailure\": false, \"forcedTier\": \"AUTO\" }
  }" | jq .executionMetadata || true

echo -e "\n=== Turn 2: Injecting Chaos Fault (_broken_test) -> Expect Instant Failover to Tier 2 AU-SYD ==="
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"message\": \"Summarize third-party vendor audit requirements.\",
    \"simulationControls\": { \"injectMockFailure\": true, \"forcedTier\": \"AUTO\" }
  }" | jq .executionMetadata || true

echo -e "\n=== Turn 3: Sticky Demotion Verification -> Expect Direct Tier 2 Routing (0ms Wasted Latency) ==="
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"message\": \"Provide a checklist for cross-border data transfer controls.\",
    \"simulationControls\": { \"injectMockFailure\": false, \"forcedTier\": \"AUTO\" }
  }" | jq .executionMetadata || true
