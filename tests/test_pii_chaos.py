# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Resilient Multi-Tier AI Failover Demo
"""
Chaos and Resiliency test suite for Sprint 5: Sovereign PII Tokenizer.
Verifies mutation healing under severe LLM hallucinations, multi-tier failovers,
Redis multi-db vault synchronization, and concurrent salt isolation.
"""

import asyncio
import pytest
from src.adk.base_agent import SovereignResilientAgent, SovereigntyPolicy
from src.adk.cascade_router import SovereignCascadeRouter
from src.adk.pii_tokenizer import SovereignPIITokenizer
from src.adk.session_service import (
    InMemorySessionService,
    RedisSessionService,
    ReplicatingSessionService,
    ResilientRedisClient,
)


@pytest.mark.asyncio
async def test_extreme_bracket_mutation_healing():
    """Verifies that fuzzy mutation healing resolves arbitrary deformed tokens from chaotic LLM generation."""
    tokenizer = SovereignPIITokenizer(salt="CHAOS99")
    vault = {}

    raw_text = (
        "Customer Jane Doe (TFN: 123 456 782, Medicare: 2123 45670 1) "
        "requested balance transfer to BSB 123-456 Account 98765432 and email jane.doe@example.com."
    )

    tokenized_text, vault, _ = tokenizer.tokenize(raw_text, vault=vault)

    # Grab the generated tokens
    person_tok = [k for k, v in vault.items() if v["type"] == "PERSON"][0]
    tfn_tok = [k for k, v in vault.items() if v["type"] == "AU_TFN"][0]
    medicare_tok = [k for k, v in vault.items() if v["type"] == "AU_MEDICARE"][0]
    bsb_tok = [k for k, v in vault.items() if v["type"] == "AU_BSB_ACCOUNT"][0]
    email_tok = [k for k, v in vault.items() if v["type"] == "EMAIL_ADDRESS"][0]

    # Construct deformed/hallucinated model response
    deformed_llm_response = (
        f"Verified account for {{{person_tok}}}'s portfolio. "
        f"Processed [{tfn_tok}] with medicare [[[{medicare_tok}]]] and [[ {bsb_tok} ]]. "
        f"Confirmation dispatched to [[{email_tok.lower()}]]."
    )

    detokenized = tokenizer.detokenize(deformed_llm_response, vault)

    assert "Jane Doe's portfolio" in detokenized
    assert "123 456 782" in detokenized
    assert "2123 45670 1" in detokenized
    assert "123-456" in detokenized
    assert "jane.doe@example.com" in detokenized
    assert "[[" not in detokenized
    assert "CHAOS99" not in detokenized


@pytest.mark.asyncio
async def test_sudden_tier1_timeout_failover_to_tier3_retains_token_mapping():
    """Verifies that an abrupt two-tier cascade failure (Tier 1 & Tier 2 down) preserves PII token mapping on Tier 3."""
    session_service = InMemorySessionService()
    agent = SovereignResilientAgent(
        name="chaos_agent",
        sovereignty_policy=SovereigntyPolicy.GLOBAL_CASCADE,
        session_service=session_service,
    )

    session_id = "chaos-failover-tier3"
    session_state = await agent.session_service.get_session(session_id)

    prompt = "Emergency: Freeze assets for account 123-456 11223344 belonging to Sarah Connor."

    # Fail Tier 1 and Tier 2 simultaneously to force execution onto Tier 3 Airgap
    result = await agent.run(
        session_state=session_state,
        prompt=prompt,
        failed_tiers=["TIER_1_GLOBAL", "TIER_2_REGIONAL"],
        enable_pii_tokenizer=True,
    )

    assert result["executionMetadata"]["activeTier"] == "TIER_3_SOVEREIGN"
    assert result["executionMetadata"]["failoverOccurred"] is True
    assert result["executionMetadata"]["failoverHops"] >= 2

    # Verify model payload was tokenized
    tokenized_prompt = result["executionMetadata"].get("tokenizedPrompt")
    assert tokenized_prompt is not None
    assert "Sarah Connor" not in tokenized_prompt
    assert "[[PII_PERSON_" in tokenized_prompt

    # Verify de-tokenized output returned to user
    saved_state = await agent.session_service.get_session(session_id)
    assert len(saved_state["pii_vault"]) >= 1


@pytest.mark.asyncio
async def test_redis_recovery_resync_merges_pii_vault():
    """Verifies that PII vault entries created during an airgapped Tier 3 crisis merge cleanly upon regional recovery."""
    t2 = RedisSessionService(ResilientRedisClient(host="127.0.0.1", port=6379, db=0))
    t3 = RedisSessionService(ResilientRedisClient(host="127.0.0.1", port=6379, db=1))
    rep_service = ReplicatingSessionService(tier2_service=t2, tier3_service=t3)

    session_id = "test-crisis-vault-merge"
    
    # 1. State before crisis on Tier 2
    t2_state = {
        "session_id": session_id,
        "stickyTier": "TIER_1_GLOBAL",
        "messages": [{"role": "user", "content": "Hello John Smith"}],
        "tokenized_messages": [{"role": "user", "content": "Hello [[PII_PERSON_1_A1]]"}],
        "pii_vault": {"PII_PERSON_1_A1": {"raw": "John Smith", "type": "PERSON", "confidence": 0.95}},
    }
    await t2.save_session(session_id, t2_state)

    # 2. Airgapped Tier 3 session processes a new turn with Jane Doe and account number
    t3_state = {
        "session_id": session_id,
        "stickyTier": "TIER_3_SOVEREIGN",
        "messages": [
            {"role": "user", "content": "Hello John Smith"},
            {"role": "model", "content": "Greetings John Smith"},
            {"role": "user", "content": "Transfer funds to Jane Doe at account 987-654 33221100"},
        ],
        "tokenized_messages": [
            {"role": "user", "content": "Hello [[PII_PERSON_1_A1]]"},
            {"role": "model", "content": "Greetings [[PII_PERSON_1_A1]]"},
            {"role": "user", "content": "Transfer funds to [[PII_PERSON_2_A1]] at account [[PII_AU_BSB_ACCOUNT_1_A1]]"},
        ],
        "pii_vault": {
            "PII_PERSON_1_A1": {"raw": "John Smith", "type": "PERSON", "confidence": 0.95},
            "PII_PERSON_2_A1": {"raw": "Jane Doe", "type": "PERSON", "confidence": 0.95},
            "PII_AU_BSB_ACCOUNT_1_A1": {"raw": "987-654 33221100", "type": "AU_BSB_ACCOUNT", "confidence": 0.98},
        },
    }
    await t3.save_session(session_id, t3_state)

    # 3. Trigger crisis recovery resync
    merged_state = await rep_service.resync_after_crisis(session_id)

    # Verify all 3 vault records are preserved in merged state
    assert len(merged_state["pii_vault"]) == 3
    assert "PII_PERSON_1_A1" in merged_state["pii_vault"]
    assert "PII_PERSON_2_A1" in merged_state["pii_vault"]
    assert "PII_AU_BSB_ACCOUNT_1_A1" in merged_state["pii_vault"]
    assert merged_state["pii_vault"]["PII_PERSON_2_A1"]["raw"] == "Jane Doe"


@pytest.mark.asyncio
async def test_concurrent_multi_session_salt_isolation():
    """Verifies that concurrent sessions tokenizing identical user inputs maintain strict salt and vault isolation."""
    tokenizer_gen = lambda sid: SovereignPIITokenizer(session_id=sid)

    async def tokenize_session(sid: str):
        tok = tokenizer_gen(sid)
        prompt = "Customer Bruce Wayne requested audit of account 111-222 33445566."
        tok_text, vault, _ = tok.tokenize(prompt, session_id=sid)
        return sid, tok_text, vault, tok._generate_salt(sid)

    tasks = [tokenize_session(f"concurrent-sess-{i}") for i in range(10)]
    results = await asyncio.gather(*tasks)

    salts = set()
    for sid, tok_text, vault, salt in results:
        salts.add(salt)
        # Each session token must contain its own unique salt
        assert salt in tok_text
        for k in vault.keys():
            assert salt in k

    # 10 sessions must produce 10 unique salts
    assert len(salts) == 10


@pytest.mark.asyncio
async def test_adversarial_malformed_tokens_and_lookalikes():
    """Verifies that non-vault brackets and lookalike strings are preserved without errors."""
    tokenizer = SovereignPIITokenizer(salt="TEST01")
    vault = {"PII_PERSON_1_TEST01": {"raw": "Clark Kent", "type": "PERSON", "confidence": 0.9}}

    adversarial_text = (
        "Formula: [[A + B]] <= [[C * D]]. "
        "Unknown token: [[PII_UNKNOWN_99_FAKESALT]]. "
        "Valid token: [[PII_PERSON_1_TEST01]]. "
        "Unclosed token: [[PII_PERSON_1_TEST01"
    )

    detokenized = tokenizer.detokenize(adversarial_text, vault)

    assert "Formula: [[A + B]] <= [[C * D]]." in detokenized
    assert "[[PII_UNKNOWN_99_FAKESALT]]" in detokenized
    assert "Valid token: Clark Kent." in detokenized
