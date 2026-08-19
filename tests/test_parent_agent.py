# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Universal Geopolitical AI Failover Demo
"""Tests for the Universal SovereignParentAgent and subagent delegation."""

import pytest
from src.adk.subagents import SovereignParentOrchestrator
from src.adk.session_service import InMemorySessionService


@pytest.mark.asyncio
async def test_parent_agent_orchestrated_turn_and_private_memory():
    """Verify that SovereignParentOrchestrator delegates to subagents and isolates private scratchpads."""
    session_service = InMemorySessionService()
    orchestrator = SovereignParentOrchestrator(session_service=session_service)
    session_id = "test-parent-001"

    # Execute an orchestrated turn
    result = await orchestrator.execute_orchestrated_turn(
        session_id=session_id,
        prompt="Verify data residency compliance and analyze risk.",
        inject_mock_failure=False,
    )

    # 1. Check orchestration metadata
    assert "orchestrationMetadata" in result
    meta = result["orchestrationMetadata"]
    assert meta["parentAgent"] == "sovereign_parent_orchestrator"
    assert meta["delegatedSpecialist"] == "domain_specialist"
    assert meta["policyVerification"]["allowed"] is True

    # 2. Verify shared conversation history was recorded
    session_state = await session_service.get_session(session_id)
    assert len(session_state["messages"]) == 2
    assert session_state["messages"][0]["role"] == "user"
    assert session_state["messages"][1]["role"] == "model"
    assert session_state["messages"][1]["executingAgent"] == "domain_specialist"

    # 3. Verify PolicyGuardAgent's private memory was updated during verification
    policy_mem = await session_service.get_private_memory(session_id, "policy_guard")
    assert policy_mem["policy_evaluations_count"] == 1
    assert policy_mem["status"] == "PASSED"

    # 4. Verify DomainSpecialistAgent did not receive policy guard's private scratchpad
    specialist_mem = await session_service.get_private_memory(session_id, "domain_specialist")
    assert "policy_evaluations_count" not in specialist_mem


@pytest.mark.asyncio
async def test_parent_agent_geopolitical_failover_to_sovereign_tier():
    """Verify that when the parent agent delegates to a subagent during a geopolitical lockout, failover to Tier 3 occurs seamlessly."""
    session_service = InMemorySessionService()
    orchestrator = SovereignParentOrchestrator(session_service=session_service)
    session_id = "test-failover-002"

    # Inject mock failure to trigger sub-100ms failover across tiers
    result = await orchestrator.execute_orchestrated_turn(
        session_id=session_id,
        prompt="Execute airgapped fallback check.",
        inject_mock_failure=True,
    )

    # Verify that failover occurred and was handled by Tier 2 or Tier 3
    exec_meta = result["executionMetadata"]
    assert exec_meta["failoverOccurred"] is True
    assert exec_meta["activeTier"] in ("TIER_2_REGIONAL", "TIER_3_SOVEREIGN")

    # Verify session stickyTier demoted
    session_state = await session_service.get_session(session_id)
    assert session_state["stickyTier"] == exec_meta["activeTier"]
