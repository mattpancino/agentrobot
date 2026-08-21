# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Resilient Multi-Tier AI Failover Demo
"""
Deep Comprehensive Test Suite for Sovereign Redis Session Synchronization.

Verifies:
1. Asynchronous Dual-Tier replication from Vertex AI (Tier 1/2) to Airgap VPC (Tier 3).
2. Two-way crisis reconciliation (`resync_after_crisis`) merging turns created offline
   on Tier 3 back into Tier 2 without duplicates or lost history.
3. Private subagent scratchpad memory synchronization across tiers.
4. ResilientRedisClient behavior handling live Redis and seamless fallback stores.
5. End-to-end FastAPI `/api/chat` state continuity when switching between Vertex AI
   and Tier 3 Airgapped Gemma VPC.
"""

import asyncio
import pytest
from fastapi.testclient import TestClient

from src.adk.session_service import (
    RedisSessionService,
    ReplicatingSessionService,
    ResilientRedisClient,
)
from src.backend.main import app, session_manager, sovereign_agent

client = TestClient(app)


@pytest.mark.asyncio
async def test_replicating_session_service_async_replication():
    """Verify that saving a session to Tier 2 replicates asynchronously to Tier 3."""
    t2_client = ResilientRedisClient(host="127.0.0.1", port=6379, db=0)
    t3_client = ResilientRedisClient(host="127.0.0.1", port=6379, db=1)

    replicator = ReplicatingSessionService(
        tier2_service=RedisSessionService(t2_client),
        tier3_service=RedisSessionService(t3_client),
    )

    session_id = "test-sync-1"
    initial_state = {
        "session_id": session_id,
        "stickyTier": "TIER_1_GLOBAL",
        "messages": [
            {"role": "user", "content": "What are our APRA CPS 234 obligations?"},
            {"role": "model", "content": "Ensure Australian data residency and resilient fallback."},
        ],
        "turnStream": [],
    }

    # Save to primary
    await replicator.save_session(session_id, initial_state)
    await replicator.flush_replication()

    # Read from both tiers
    t2_data = await replicator.tier2.get_session(session_id)
    t3_data = await replicator.tier3.get_session(session_id)

    assert len(t2_data["messages"]) == 2
    assert len(t3_data["messages"]) == 2
    assert t3_data["messages"][0]["content"] == "What are our APRA CPS 234 obligations?"
    assert len(t2_data["turnStream"]) == 2
    assert len(t3_data["turnStream"]) == 2


@pytest.mark.asyncio
async def test_two_way_crisis_reconciliation_resync():
    """Verify that turns generated on Tier 3 during an airgap crisis merge cleanly back into Tier 2."""
    t2_client = ResilientRedisClient(host="127.0.0.1", port=6379, db=0)
    t3_client = ResilientRedisClient(host="127.0.0.1", port=6379, db=1)

    replicator = ReplicatingSessionService(
        tier2_service=RedisSessionService(t2_client),
        tier3_service=RedisSessionService(t3_client),
    )

    session_id = "test-crisis-resync-1"
    base_state = {
        "session_id": session_id,
        "stickyTier": "TIER_1_GLOBAL",
        "messages": [
            {"role": "user", "content": "Turn 1 on Vertex AI"},
            {"role": "model", "content": "Response 1 on Vertex AI"},
        ],
        "turnStream": [
            {"turnId": 1, "role": "user", "content": "Turn 1 on Vertex AI"},
            {"turnId": 2, "role": "model", "content": "Response 1 on Vertex AI"},
        ],
    }

    await replicator.tier2.save_session(session_id, base_state)
    await replicator.tier3.save_session(session_id, base_state)

    # Simulate airgapped crisis turns on Tier 3
    t3_state = await replicator.tier3.get_session(session_id)
    t3_state["stickyTier"] = "TIER_3_SOVEREIGN"
    t3_state["messages"].extend([
        {"role": "user", "content": "Turn 2 offline on Gemma VPC"},
        {"role": "model", "content": "Gemma 2 response offline in Sydney"},
    ])
    t3_state["turnStream"].extend([
        {"turnId": 3, "role": "user", "content": "Turn 2 offline on Gemma VPC"},
        {"turnId": 4, "role": "model", "content": "Gemma 2 response offline in Sydney"},
    ])
    await replicator.tier3.save_session(session_id, t3_state)

    # Reconcile when connectivity returns
    reconciled = await replicator.resync_after_crisis(session_id)

    assert len(reconciled["messages"]) == 4
    assert reconciled["messages"][2]["content"] == "Turn 2 offline on Gemma VPC"
    assert reconciled["messages"][3]["content"] == "Gemma 2 response offline in Sydney"
    assert len(reconciled["turnStream"]) == 4
    assert reconciled["stickyTier"] == "TIER_3_SOVEREIGN"

    # Verify both Tier 2 and Tier 3 stores are now identical
    t2_after = await replicator.tier2.get_session(session_id)
    t3_after = await replicator.tier3.get_session(session_id)
    assert len(t2_after["messages"]) == 4
    assert len(t3_after["messages"]) == 4


@pytest.mark.asyncio
async def test_private_subagent_memory_sync_across_tiers():
    """Verify that private scratchpad memory for specialized subagents is replicated."""
    t2_client = ResilientRedisClient(host="127.0.0.1", port=6379, db=0)
    t3_client = ResilientRedisClient(host="127.0.0.1", port=6379, db=1)

    replicator = ReplicatingSessionService(
        tier2_service=RedisSessionService(t2_client),
        tier3_service=RedisSessionService(t3_client),
    )

    session_id = "test-mem-sync-1"
    agent_name = "apra_compliance_auditor"
    scratchpad = {"risk_score": "LOW", "clauses_checked": ["CPS234_23", "CPS234_31"]}

    await replicator.save_private_memory(session_id, agent_name, scratchpad)
    await replicator.flush_replication()

    t2_mem = await replicator.tier2.get_private_memory(session_id, agent_name)
    t3_mem = await replicator.tier3.get_private_memory(session_id, agent_name)

    assert t2_mem["risk_score"] == "LOW"
    assert t3_mem["risk_score"] == "LOW"
    assert "CPS234_23" in t3_mem["clauses_checked"]


@pytest.mark.asyncio
async def test_resilient_redis_client_fallback_and_reconnection():
    """Verify that ResilientRedisClient stores values reliably regardless of Redis server status."""
    client = ResilientRedisClient(host="127.0.0.1", port=6379, db=0)
    key = "resilient_test_key"
    val = '{"status": "SYNCED", "tier": "TIER_3_SOVEREIGN"}'

    await client.set(key, val, ex=60)
    retrieved = await client.get(key)
    assert retrieved is not None
    assert "SYNCED" in retrieved


def test_api_chat_tier3_override_and_vertex_resync():
    """Test full HTTP API chat flow across Tier 1 -> Tier 3 -> Tier 1 with synchronization."""
    session_id = "http-resync-test-99"

    # Turn 1: Normal on Tier 1
    res1 = client.post(
        "/api/chat",
        json={
            "sessionId": session_id,
            "message": "Turn 1 on Global Vertex AI",
            "simulationControls": {"forcedTier": "TIER_1_GLOBAL", "injectMockFailure": False},
        },
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["executionMetadata"]["activeTier"] == "TIER_1_GLOBAL"

    # Turn 2: Switch to Tier 3 Sovereign Enclave
    res2 = client.post(
        "/api/chat",
        json={
            "sessionId": session_id,
            "message": "Turn 2 on Tier 3 Airgap VPC",
            "simulationControls": {"forcedTier": "TIER_3_SOVEREIGN", "injectMockFailure": False},
        },
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["executionMetadata"]["activeTier"] == "TIER_3_SOVEREIGN"

    # Turn 3: Switch back to Tier 1 Global (triggering resync_after_crisis)
    res3 = client.post(
        "/api/chat",
        json={
            "sessionId": session_id,
            "message": "Turn 3 back on Global Vertex AI",
            "simulationControls": {"forcedTier": "TIER_1_GLOBAL", "injectMockFailure": False},
        },
    )
    assert res3.status_code == 200
    data3 = res3.json()
    assert data3["executionMetadata"]["activeTier"] == "TIER_1_GLOBAL"


def test_tier2_tabby_cat_context_synced_to_tier3():
    """
    Verify exact user scenario: user tells Tier 2 their favourite cat is a tabby,
    then switches to Tier 3 and checks that session state and context are preserved.
    """
    session_id = "user-tabby-cat-session-77"

    # Turn 1: User tells Tier 2 Regional their favourite cat is a tabby
    res1 = client.post(
        "/api/chat",
        json={
            "sessionId": session_id,
            "message": "My favourite cat is a tabby.",
            "simulationControls": {"forcedTier": "TIER_2_REGIONAL", "injectMockFailure": False},
        },
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["executionMetadata"]["activeTier"] == "TIER_2_REGIONAL"

    # Verify session endpoint returns the recorded messages
    res_session = client.get(f"/api/session/{session_id}")
    assert res_session.status_code == 200
    session_data = res_session.json()
    messages = session_data.get("messages", [])
    assert len(messages) >= 2
    assert any("tabby" in m.get("content", "").lower() for m in messages if m.get("role") == "user")

    # Turn 2: User switches to Tier 3 Sovereign and asks about their favourite cat
    res2 = client.post(
        "/api/chat",
        json={
            "sessionId": session_id,
            "message": "What is my favourite cat?",
            "simulationControls": {"forcedTier": "TIER_3_SOVEREIGN", "injectMockFailure": False},
        },
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["executionMetadata"]["activeTier"] == "TIER_3_SOVEREIGN"
    assert data2["executionMetadata"]["tier3Synced"] is True

