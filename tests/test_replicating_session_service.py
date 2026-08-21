# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Universal Geopolitical AI Failover Demo
"""
Unit tests for ReplicatingSessionService and Two-Way Turn Reconciliation (AC-07).
"""

import pytest
from src.adk.session_service import InMemorySessionService, ReplicatingSessionService


@pytest.mark.asyncio
async def test_fast_tier2_write_and_async_tier3_replication():
    """Verify that save_session writes immediately to Tier 2 and asynchronously replicates to Tier 3."""
    t2 = InMemorySessionService()
    t3 = InMemorySessionService()
    replicator = ReplicatingSessionService(tier2_service=t2, tier3_service=t3)
    session_id = "sess-rep-001"

    state = {
        "session_id": session_id,
        "stickyTier": "TIER_1_GLOBAL",
        "messages": [
            {"role": "user", "content": "What is the APRA reporting deadline?"},
            {"role": "model", "content": "72 hours under APRA CPS 234."},
        ],
    }

    await replicator.save_session(session_id, state)

    # Verify Tier 2 has state immediately with turnStream populated
    t2_state = await t2.get_session(session_id)
    assert len(t2_state["turnStream"]) == 2
    assert t2_state["turnStream"][0]["turnId"] == 1
    assert t2_state["turnStream"][1]["turnId"] == 2
    assert t2_state["turnStream"][1]["role"] == "model"

    # Flush background replication
    await replicator.flush_replication()

    # Verify Tier 3 standby replica now has the exact mirrored state
    t3_state = await t3.get_session(session_id)
    assert t3_state["stickyTier"] == "TIER_1_GLOBAL"
    assert len(t3_state["turnStream"]) == 2
    assert t3_state["turnStream"][1]["content"] == "72 hours under APRA CPS 234."


@pytest.mark.asyncio
async def test_private_memory_replication():
    """Verify that agent private memory scratchpads replicate from Tier 2 to Tier 3."""
    t2 = InMemorySessionService()
    t3 = InMemorySessionService()
    replicator = ReplicatingSessionService(tier2_service=t2, tier3_service=t3)

    session_id = "sess-priv-002"
    agent_name = "policy_guard"
    private_data = {"policy_evaluations_count": 3, "status": "PASSED"}

    await replicator.save_private_memory(session_id, agent_name, private_data)
    await replicator.flush_replication()

    t2_mem = await t2.get_private_memory(session_id, agent_name)
    t3_mem = await t3.get_private_memory(session_id, agent_name)

    assert t2_mem["policy_evaluations_count"] == 3
    assert t3_mem["policy_evaluations_count"] == 3
    assert t3_mem["status"] == "PASSED"


@pytest.mark.asyncio
async def test_two_way_turn_reconciliation_after_crisis():
    """
    Verify two-way turn resync:
    When Tier 3 acts as standalone primary during a cloud severance or airgapped crisis,
    newly generated turns in Tier 3 merge cleanly back into Tier 2 when connectivity resumes.
    """
    t2 = InMemorySessionService()
    t3 = InMemorySessionService()
    replicator = ReplicatingSessionService(tier2_service=t2, tier3_service=t3)
    session_id = "sess-crisis-999"

    # Step 1: Initial conversation on Tier 2 before crisis
    initial_state = {
        "session_id": session_id,
        "stickyTier": "TIER_1_GLOBAL",
        "messages": [{"role": "user", "content": "Initial prompt before outage"}],
    }
    await replicator.save_session(session_id, initial_state)
    await replicator.flush_replication()

    # Step 2: Cloud severance occurs! Tier 3 operates independently in airgapped crisis mode
    t3_state = await t3.get_session(session_id)
    t3_state["stickyTier"] = "TIER_3_SOVEREIGN"
    t3_state["messages"].append({"role": "model", "content": "Fallback answer from local Gemma 2"})
    t3_state["turnStream"].append({
        "turnId": 2,
        "timestamp": "2026-08-20T01:00:00Z",
        "role": "model",
        "content": "Fallback answer from local Gemma 2",
        "servedByTier": "TIER_3_SOVEREIGN",
    })
    await t3.save_session(session_id, t3_state)

    # Verify Tier 2 does NOT have turn 2 yet
    t2_before_resync = await t2.get_session(session_id)
    assert len(t2_before_resync["messages"]) == 1

    # Step 3: Reconnection & Two-Way Crisis Reconciliation
    reconciled = await replicator.resync_after_crisis(session_id)

    # Verify merged turnStream and messages in Tier 2
    assert len(reconciled["messages"]) == 2
    assert len(reconciled["turnStream"]) == 2
    assert reconciled["turnStream"][0]["turnId"] == 1
    assert reconciled["turnStream"][1]["turnId"] == 2
    assert "Fallback answer from local Gemma 2" in reconciled["messages"][1]["content"]
    assert reconciled["stickyTier"] == "TIER_3_SOVEREIGN"

    # Verify Tier 2 store was updated
    t2_final = await t2.get_session(session_id)
    assert len(t2_final["messages"]) == 2
    assert t2_final["stickyTier"] == "TIER_3_SOVEREIGN"
