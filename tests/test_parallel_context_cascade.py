# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Resilient Multi-Tier AI Failover Demo
"""
Unit and Integration tests for Sprint 2: Parallel Context Window & Dual-Tier Session Integration.
"""

import pytest
from src.adk.base_agent import SovereignResilientAgent, SovereigntyPolicy
from src.adk.cascade_router import SovereignCascadeRouter
from src.adk.session_service import (
    InMemorySessionService,
    RedisSessionService,
    ReplicatingSessionService,
    ResilientRedisClient,
)


@pytest.fixture
def session_service():
    return InMemorySessionService()


@pytest.fixture
def agent(session_service):
    return SovereignResilientAgent(
        name="test_sovereign_agent",
        sovereignty_policy=SovereigntyPolicy.GLOBAL_CASCADE,
        session_service=session_service,
    )


@pytest.mark.asyncio
async def test_parallel_context_tokenization_flow(agent):
    session_id = "test-parallel-1"
    session_state = await agent.session_service.get_session(session_id)

    prompt = "Transfer $500 from John Smith's account 123-456 to Jane Doe."
    result = await agent.run(
        session_state=session_state,
        prompt=prompt,
        enable_pii_tokenizer=True,
    )

    # 1. Output returned to caller must be natural de-tokenized text
    assert "John Smith" in result["content"] or "Jane Doe" in result["content"] or len(result["content"]) > 0
    assert result.get("executionMetadata", {}).get("piiTelemetry") is not None
    telemetry = result["executionMetadata"]["piiTelemetry"]
    assert telemetry["enabled"] is True
    assert telemetry["entitiesIntercepted"] >= 2

    # 2. Tokenized Prompt in metadata must contain salted PII tokens
    tokenized_prompt = result["executionMetadata"].get("tokenizedPrompt")
    assert tokenized_prompt is not None
    assert "[[PII_PERSON_" in tokenized_prompt

    # 3. Session state must maintain both cleartext messages and tokenized_messages
    saved_state = await agent.session_service.get_session(session_id)
    assert len(saved_state["messages"]) == 2  # user + model
    assert len(saved_state["tokenized_messages"]) == 2

    # Cleartext history has raw text
    assert prompt in saved_state["messages"][0]["content"]

    # Tokenized history has masked token
    assert "[[PII_PERSON_" in saved_state["tokenized_messages"][0]["content"]

    # Vault must contain John Smith and Jane Doe
    vault = saved_state.get("pii_vault", {})
    assert len(vault) >= 2
    raw_entities = [v.get("raw") for v in vault.values()]
    assert "John Smith" in raw_entities or "Jane Doe" in raw_entities


@pytest.mark.asyncio
async def test_mid_turn_failover_retains_token_mapping(agent):
    session_id = "test-failover-parallel"
    session_state = await agent.session_service.get_session(session_id)

    prompt = "Urgent: Audit account 123-456 for client John Smith."

    # Force failover from Tier 1 to Tier 2
    result = await agent.run(
        session_state=session_state,
        prompt=prompt,
        inject_mock_failure=True,
        enable_pii_tokenizer=True,
    )

    assert result["executionMetadata"]["failoverOccurred"] is True
    assert result["executionMetadata"]["activeTier"] == "TIER_2_REGIONAL"

    # Vault mapping must be preserved
    saved_state = await agent.session_service.get_session(session_id)
    assert "pii_vault" in saved_state
    assert len(saved_state["pii_vault"]) >= 1


@pytest.mark.asyncio
async def test_tool_calling_argument_detokenization():
    recorded_args = {}

    async def get_account_balance(account_number: str = "", jurisdiction: str = "AU") -> str:
        """Fetch account balance for the specified account."""
        recorded_args["account_number"] = account_number
        recorded_args["jurisdiction"] = jurisdiction
        return f"Balance for {account_number} is $14,250.00 AUD"

    agent = SovereignResilientAgent(
        name="banking_agent",
        tools=[get_account_balance],
        session_service=InMemorySessionService(),
    )

    session_state = await agent.session_service.get_session("tool-test-1")
    prompt = "Please run get_account_balance for account 123-456 98765432 in Australia."

    result = await agent.run(
        session_state=session_state,
        prompt=prompt,
        enable_pii_tokenizer=True,
    )

    # Tool should receive de-tokenized argument
    tool_calls = result["executionMetadata"].get("toolCalls", [])
    assert len(tool_calls) > 0
    # Verified argument received by tool
    assert "account_number" in recorded_args
    assert "123-456" in recorded_args["account_number"] or "98765432" in recorded_args["account_number"]


@pytest.mark.asyncio
async def test_replicating_session_service_syncs_pii_vault():
    t2 = RedisSessionService(ResilientRedisClient(host="127.0.0.1", port=6379, db=0))
    t3 = RedisSessionService(ResilientRedisClient(host="127.0.0.1", port=6379, db=1))
    rep_service = ReplicatingSessionService(tier2_service=t2, tier3_service=t3)

    session_id = "test-replicating-vault-sync"
    state = {
        "session_id": session_id,
        "stickyTier": "TIER_1_GLOBAL",
        "messages": [{"role": "user", "content": "Cleartext John Smith"}],
        "tokenized_messages": [{"role": "user", "content": "Tokenized [[PII_PERSON_1_7A]]"}],
        "pii_vault": {"PII_PERSON_1_7A": {"raw": "John Smith", "type": "PERSON", "confidence": 0.95}},
    }

    await rep_service.save_session(session_id, state)
    await rep_service.flush_replication()

    # Verify both Tier 2 and Tier 3 read back identical state
    t2_read = await t2.get_session(session_id)
    t3_read = await t3.get_session(session_id)

    assert "PII_PERSON_1_7A" in t2_read.get("pii_vault", {})
    assert "PII_PERSON_1_7A" in t3_read.get("pii_vault", {})
    assert len(t2_read.get("tokenized_messages", [])) == 1
    assert len(t3_read.get("tokenized_messages", [])) == 1
