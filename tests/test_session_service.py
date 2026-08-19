# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Universal Geopolitical AI Failover Demo
"""Tests for the Pluggable SessionService and private agent memory namespaces."""

import pytest
from src.adk.session_service import InMemorySessionService


@pytest.mark.asyncio
async def test_session_service_shared_transcript():
    """Verify that get_session and save_session persist shared conversation transcript."""
    service = InMemorySessionService()
    session_id = "test-shared-101"

    session = await service.get_session(session_id)
    assert session["session_id"] == session_id
    assert session["stickyTier"] == "TIER_1_GLOBAL"
    assert session["messages"] == []

    # Update shared state
    session["stickyTier"] = "TIER_2_REGIONAL"
    session["messages"].append({"role": "user", "content": "Hello"})
    await service.save_session(session_id, session)

    fetched = await service.get_session(session_id)
    assert fetched["stickyTier"] == "TIER_2_REGIONAL"
    assert len(fetched["messages"]) == 1
    assert fetched["messages"][0]["content"] == "Hello"


@pytest.mark.asyncio
async def test_session_service_private_memory_isolation():
    """Verify that private memory is strictly isolated between distinct agents on the same session."""
    service = InMemorySessionService()
    session_id = "test-isolation-202"

    # Agent A (Policy Guard) writes to its private scratchpad
    policy_mem = await service.get_private_memory(session_id, "policy_guard")
    policy_mem["compliance_score"] = 0.99
    policy_mem["confidential_audit_flag"] = "VERIFIED_SECURE"
    await service.save_private_memory(session_id, "policy_guard", policy_mem)

    # Agent B (Domain Specialist) reads its own private memory
    specialist_mem = await service.get_private_memory(session_id, "domain_specialist")
    assert "compliance_score" not in specialist_mem
    assert "confidential_audit_flag" not in specialist_mem

    # Verify Agent A's memory remains intact
    policy_fetched = await service.get_private_memory(session_id, "policy_guard")
    assert policy_fetched["compliance_score"] == 0.99
    assert policy_fetched["confidential_audit_flag"] == "VERIFIED_SECURE"
