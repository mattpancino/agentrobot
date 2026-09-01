# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Resilient Multi-Tier AI Failover Demo
"""
Unit tests for Sprint 3: Multi-tier Context Window & Memory Parity.

Verifies that conversation history (context window) is strictly preserved
across turns and seamless failover hops between Tier 1, Tier 2, and Tier 3.
"""

import pytest
import pytest_asyncio
from typing import Dict, Any, List

from src.adk.cascade_router import SovereignCascadeRouter
from src.adk.base_agent import SovereignResilientAgent
from src.adk.session_service import InMemorySessionService
from src.adk.schema_adapter import normalize_messages_for_gemma


@pytest.mark.asyncio
async def test_context_window_multi_turn_retention():
    """Verifies that subsequent turns receive complete conversation history in the context window."""
    session_service = InMemorySessionService()
    agent = SovereignResilientAgent(
        name="test_context_agent",
        session_service=session_service,
    )

    session_id = "test-session-context-1"
    session_state = await session_service.get_session(session_id)

    # Turn 1: Ask for 5 dog breeds
    res1 = await agent.run(
        session_state=session_state,
        prompt="List 5 dog breeds.",
    )
    await session_service.save_session(session_id, session_state)

    assert "messages" in session_state
    assert len(session_state["messages"]) == 2
    assert session_state["messages"][0]["role"] == "user"
    assert session_state["messages"][0]["content"] == "List 5 dog breeds."
    assert session_state["messages"][1]["role"] == "model"
    assert len(session_state["messages"][1]["content"]) > 0

    # Turn 2: Follow-up referencing Turn 1
    reloaded_state = await session_service.get_session(session_id)
    res2 = await agent.run(
        session_state=reloaded_state,
        prompt="What was the first dog breed?",
    )
    await session_service.save_session(session_id, reloaded_state)

    assert len(reloaded_state["messages"]) == 4
    assert reloaded_state["messages"][2]["role"] == "user"
    assert reloaded_state["messages"][2]["content"] == "What was the first dog breed?"
    assert reloaded_state["messages"][3]["role"] == "model"


@pytest.mark.asyncio
async def test_context_window_preserved_during_tier_1_failover():
    """Verifies that when Tier 1 fails, the full context window is delivered to Tier 2."""
    session_service = InMemorySessionService()
    agent = SovereignResilientAgent(
        name="test_failover_context_agent",
        session_service=session_service,
    )

    session_id = "test-session-failover-context"
    session_state = await session_service.get_session(session_id)

    # Pre-populate session state with Turn 1
    session_state["messages"] = [
        {"role": "user", "content": "1. Max, 2. Bella, 3. Charlie, 4. Lucy, 5. Buddy"},
        {"role": "model", "content": "Acknowledged list of dogs: Max, Bella, Charlie, Lucy, Buddy."},
    ]

    # Turn 2 with Tier 1 fault injected
    res = await agent.run(
        session_state=session_state,
        prompt="What was the second dog name?",
        inject_mock_failure=True,  # Injects fault on Tier 1
    )

    meta = res["executionMetadata"]
    assert meta["failoverOccurred"] is True
    assert meta["activeTier"] in ("TIER_2_REGIONAL", "TIER_3_SOVEREIGN")

    # Verify session now has 4 turns and preserved original context
    assert len(session_state["messages"]) == 4
    assert session_state["messages"][0]["content"] == "1. Max, 2. Bella, 3. Charlie, 4. Lucy, 5. Buddy"
    assert session_state["messages"][2]["content"] == "What was the second dog name?"


def test_normalize_messages_for_gemma_context_window():
    """Verifies that conversation history is properly translated to Gemma / OpenAI roles."""
    history = [
        {"role": "user", "content": "Hello"},
        {"role": "model", "content": "Hi there! How can I help?"},
        {"role": "user", "content": "What is the capital of Australia?"},
    ]

    normalized = normalize_messages_for_gemma(history, system_prompt="You are an enterprise assistant.")
    
    assert normalized[0]["role"] == "system"
    assert "enterprise assistant" in normalized[0]["content"]
    assert normalized[1]["role"] == "user"
    assert normalized[1]["content"] == "Hello"
    assert normalized[2]["role"] == "assistant"
    assert normalized[2]["content"] == "Hi there! How can I help?"
    assert normalized[3]["role"] == "user"
    assert normalized[3]["content"] == "What is the capital of Australia?"
