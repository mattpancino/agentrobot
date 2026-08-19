# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Resilient Multi-Tier AI Failover Demo
"""
Unit tests for the Asynchronous Recovery Sentinel and Mock Gemma vLLM Server.
"""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from src.adk.recovery_sentinel import RecoverySentinel
from src.backend.mock_gemma_server import app


@pytest.fixture
def mock_demoted_session():
    """Simulates an ADK session demoted to sticky Tier 2 AU-SYD."""
    return {
        "session_id": "sentinel-demo-99",
        "stickyTier": "TIER_2_REGIONAL",
    }


@pytest.fixture
def sentinel():
    return RecoverySentinel(
        probe_interval_sec=0.1,
        required_successes=2,
        latency_sla_ms=600,
        target_tier="TIER_1_GLOBAL",
    )


@pytest.fixture
def gemma_client():
    return TestClient(app)


@pytest.mark.asyncio
async def test_sentinel_idle_when_on_target_tier(sentinel):
    """When session is already on TIER_1_GLOBAL, Sentinel returns IDLE_HEALTHY."""
    session_state = {"stickyTier": "TIER_1_GLOBAL"}

    status = await sentinel.run_probe_cycle(session_state)

    assert status["status"] == "IDLE_HEALTHY"
    assert session_state["stickyTier"] == "TIER_1_GLOBAL"
    assert "already TIER_1_GLOBAL" in status["message"]


@pytest.mark.asyncio
async def test_sentinel_single_success_leaves_sticky_demoted(sentinel, mock_demoted_session):
    """First healthy check increments success counter but does not promote session."""
    with patch.object(sentinel, "_probe_endpoint", new_callable=AsyncMock) as mock_probe:
        mock_probe.return_value = (True, 115)  # Healthy, 115ms (under 600ms SLA)

        status = await sentinel.run_probe_cycle(mock_demoted_session)

        assert status["status"] == "PROBING_BACKGROUND"
        assert status["consecutiveSuccesses"] == 1
        assert mock_demoted_session["stickyTier"] == "TIER_2_REGIONAL"
        assert "1/2" in status["message"]


@pytest.mark.asyncio
async def test_sentinel_two_consecutive_successes_promotes(sentinel, mock_demoted_session):
    """Two consecutive healthy checks promote stickyTier back to TIER_1_GLOBAL."""
    with patch.object(sentinel, "_probe_endpoint", new_callable=AsyncMock) as mock_probe:
        mock_probe.return_value = (True, 120)

        # 1st cycle -> 1/2 success
        await sentinel.run_probe_cycle(mock_demoted_session)
        assert mock_demoted_session["stickyTier"] == "TIER_2_REGIONAL"

        # 2nd cycle -> 2/2 success -> PROMOTION!
        status2 = await sentinel.run_probe_cycle(mock_demoted_session)

        assert status2["status"] == "PROMOTED_RESTORED"
        assert status2["consecutiveSuccesses"] == 2
        assert mock_demoted_session["stickyTier"] == "TIER_1_GLOBAL"
        assert "Session auto-promoted to Global!" in status2["message"]


@pytest.mark.asyncio
async def test_sentinel_probe_failure_resets_hysteresis(sentinel, mock_demoted_session):
    """If probe 2 fails or exceeds latency SLA, consecutive counter resets to 0."""
    with patch.object(sentinel, "_probe_endpoint", new_callable=AsyncMock) as mock_probe:
        # Cycle 1: Healthy (110ms)
        mock_probe.return_value = (True, 110)
        status1 = await sentinel.run_probe_cycle(mock_demoted_session)
        assert status1["consecutiveSuccesses"] == 1

        # Cycle 2: High latency breach (850ms > 600ms SLA)
        mock_probe.return_value = (True, 850)
        status2 = await sentinel.run_probe_cycle(mock_demoted_session)

        assert status2["status"] == "PROBE_FAILED_HYSTERESIS_RESET"
        assert status2["consecutiveSuccesses"] == 0
        assert mock_demoted_session["stickyTier"] == "TIER_2_REGIONAL"
        assert "exceeded latency SLA" in status2["message"]


def test_mock_gemma_server_models_endpoint(gemma_client):
    """Test that GET /v1/models returns OpenAI-compatible registry with Gemma-2."""
    response = gemma_client.get("/v1/models")
    assert response.status_code == 200
    data = response.json()

    assert data["object"] == "list"
    model_ids = [m["id"] for m in data["data"]]
    assert "google/gemma-2-2b-it" in model_ids
    assert "google/gemma-2-9b-it" in model_ids
    assert "google/gemma-2-27b-it" in model_ids


def test_mock_gemma_server_chat_completions(gemma_client):
    """Test POST /v1/chat/completions returns valid sovereign airgap response."""
    payload = {
        "model": "google/gemma-2-2b-it",
        "messages": [
            {"role": "system", "content": "APRA FSI Compliance Advisor"},
            {"role": "user", "content": "What is the policy for cross-border data transit?"},
        ],
        "temperature": 0.2,
    }

    response = gemma_client.post("/v1/chat/completions", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["object"] == "chat.completion"
    assert data["model"] == "google/gemma-2-2b-it"
    reply_content = data["choices"][0]["message"]["content"]
    assert "SOVEREIGN ENCLAVE" in reply_content
    assert "sovereign VPC" in reply_content
    assert "zero external egress" in reply_content
    assert data["usage"]["total_tokens"] > 0

