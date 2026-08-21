# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Resilient Multi-Tier AI Failover Demo
"""
Unit tests for SovereignCascadeRouter, Schema Adapter, and Enterprise Base Agent.
"""

import pytest
from unittest.mock import AsyncMock, patch
from src.adk.cascade_router import SovereignCascadeRouter
from src.adk.schema_adapter import normalize_messages_for_gemma
from src.adk.base_agent import SovereignResilientAgent, SovereigntyPolicy


@pytest.fixture
def mock_session_store():
    """Simulates Redis ADK Session State dictionary."""
    return {
        "session_id": "test-session-123",
        "stickyTier": "TIER_1_GLOBAL",
        "messages": [
            {"role": "user", "content": "Initial prompt"},
            {"role": "model", "content": "Initial response from Gemini"},
        ],
    }


@pytest.fixture
def router():
    return SovereignCascadeRouter(
        t1_model="gemini-1.5-pro-002",
        t2_model="gemini-1.5-flash-002",
        t2_region="australia-southeast1",
        t3_endpoint="http://127.0.0.1:8001/v1",
        t3_model="google/gemma-2-2b-it",
    )


@pytest.mark.asyncio
async def test_tier1_normal_execution(router, mock_session_store):
    """Test standard execution when Tier 1 (Global Gemini Pro) is healthy."""
    with patch.object(router, "_invoke_gemini", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = ("Global Response", 200)

        result = await router.execute_turn(
            session_state=mock_session_store,
            prompt="Analyze audit risks.",
            inject_mock_failure=False,
        )

        assert result["executionMetadata"]["activeTier"] == "TIER_1_GLOBAL"
        assert result["executionMetadata"]["failoverOccurred"] is False
        assert result["executionMetadata"]["routingMode"] == "NORMAL"
        assert mock_session_store["stickyTier"] == "TIER_1_GLOBAL"
        mock_gemini.assert_called_once()


@pytest.mark.asyncio
async def test_mock_failure_injection_and_fallback(router, mock_session_store):
    """Test that injecting _broken_test triggers sub-100ms failover to Tier 2 AU-SYD."""
    result = await router.execute_turn(
        session_state=mock_session_store,
        prompt="Trigger chaos fault.",
        inject_mock_failure=True,
    )

    metadata = result["executionMetadata"]
    assert metadata["activeTier"] == "TIER_2_REGIONAL"
    assert metadata["failoverOccurred"] is True
    assert metadata["failoverHops"] == 1
    assert "australia-southeast1" in metadata["executionLocation"]
    assert "Regional Data Residency" in metadata["sovereigntyClassification"]

    # Verify that the session state was demoted sticky to TIER_2_REGIONAL
    assert mock_session_store["stickyTier"] == "TIER_2_REGIONAL"
    assert len(metadata["failoverLog"]) == 2
    assert "404 NotFound" in metadata["failoverLog"][0]["error"]


@pytest.mark.asyncio
async def test_sticky_demotion_zero_wasted_latency(router, mock_session_store):
    """Test that once sticky demoted to Tier 2, subsequent turns bypass Tier 1 completely."""
    # Pre-set session to sticky Tier 2 AU-SYD
    mock_session_store["stickyTier"] = "TIER_2_REGIONAL"

    with patch.object(router, "_invoke_gemini", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = ("Direct AU-SYD Response", 200)

        result = await router.execute_turn(
            session_state=mock_session_store,
            prompt="Follow-up question on sticky tier.",
            inject_mock_failure=False,
        )

        metadata = result["executionMetadata"]
        assert metadata["activeTier"] == "TIER_2_REGIONAL"
        assert metadata["routingMode"] == "STICKY_FALLBACK"
        assert metadata["wastedLatencyAvoidedMs"] == 1200
        assert metadata["failoverOccurred"] is False

        # Ensure Tier 1 was NEVER attempted
        assert mock_gemini.call_count == 1
        called_tier = mock_gemini.call_args[1]["tier_cfg"].tier_id
        assert called_tier == "TIER_2_REGIONAL"


@pytest.mark.asyncio
async def test_forced_tier_override_sovereign_vpc(router, mock_session_store):
    """Test manual presenter override directly to airgapped Tier 3 VPC Gemma."""
    result = await router.execute_turn(
        session_state=mock_session_store,
        prompt="Verify airgapped query execution.",
        forced_tier="TIER_3_SOVEREIGN",
    )

    metadata = result["executionMetadata"]
    assert metadata["activeTier"] == "TIER_3_SOVEREIGN"
    assert metadata["modelUsed"] == "google/gemma-2-2b-it"
    assert metadata["routingMode"] == "MANUAL_OVERRIDE"
    assert "Private VPC" in metadata["executionLocation"]
    assert "Airgapped" in metadata["sovereigntyClassification"]


def test_schema_adapter_gemini_to_gemma():
    """Test accurate message history normalization from Gemini to OpenAI/vLLM format."""
    gemini_messages = [
        {"role": "user", "content": "Hello"},
        {"role": "model", "content": "Hi, how can I assist?"},
        {"role": "user", "content": "Analyze APRA rules."},
    ]

    gemma_messages = normalize_messages_for_gemma(
        gemini_messages, system_prompt="You are an APRA FSI Compliance Advisor."
    )

    assert len(gemma_messages) == 4
    assert gemma_messages[0] == {
        "role": "system",
        "content": "You are an APRA FSI Compliance Advisor.",
    }
    assert gemma_messages[1] == {"role": "user", "content": "Hello"}
    assert gemma_messages[2] == {"role": "assistant", "content": "Hi, how can I assist?"}
    assert gemma_messages[3] == {"role": "user", "content": "Analyze APRA rules."}


@pytest.mark.asyncio
async def test_enterprise_subclass_agent():
    """Test that domain squads can subclass SovereignResilientAgent and inherit resilience."""

    class FraudInvestigationAgent(SovereignResilientAgent):
        def __init__(self):
            super().__init__(
                name="fraud_agent",
                instruction="APRA Fraud Investigation Rules",
                sovereignty_policy=SovereigntyPolicy.AU_SYD_REGIONAL_OR_AIRGAP,
            )

    agent = FraudInvestigationAgent()
    session = {"session_id": "fraud-101"}

    result = await agent.run(session_state=session, prompt="Check flagged account.")

    # Must execute on Tier 2 Regional AU-SYD because of the agent's SovereigntyPolicy
    assert result["executionMetadata"]["activeTier"] == "TIER_2_REGIONAL"
    assert "australia-southeast1" in result["executionMetadata"]["executionLocation"]
    assert len(session["messages"]) == 2
    assert session["messages"][0]["role"] == "user"
    assert session["messages"][1]["role"] == "model"


@pytest.mark.asyncio
async def test_invoke_gemma_vpc_http_request(router):
    """Test that _invoke_gemma_vpc makes an OpenAI/vLLM HTTP POST request when not in test simulation."""
    tier_cfg = router.tiers["TIER_3_SOVEREIGN"]
    messages = [{"role": "user", "content": "Hello VPC Gemma"}]

    class MockResponse:
        status_code = 200
        def json(self):
            return {
                "choices": [
                    {"message": {"role": "assistant", "content": "Live VPC Gemma Response"}}
                ]
            }

    mock_client = AsyncMock()
    mock_client.post.return_value = MockResponse()
    mock_client_context = AsyncMock()
    mock_client_context.__aenter__.return_value = mock_client
    mock_client_context.__aexit__.return_value = None

    with patch.dict("os.environ", {"PYTEST_CURRENT_TEST": ""}):
        with patch("httpx.AsyncClient", return_value=mock_client_context):
            content, status = await router._invoke_gemma_vpc(
                tier_cfg=tier_cfg,
                messages=messages,
                prompt="Follow up question",
                system_instruction="System instruction",
                model_name="google/gemma-2-2b-it",
            )

    assert status == 200
    assert content == "Live VPC Gemma Response"
    mock_client.post.assert_called_once()
    call_args, call_kwargs = mock_client.post.call_args
    assert call_args[0] == "http://127.0.0.1:8001/v1/chat/completions"
    assert call_kwargs["json"]["model"] == "gemma2:2b"
    assert call_kwargs["json"]["messages"][0]["role"] == "system"


@pytest.mark.asyncio
async def test_single_tier_failure_checkbox(router, mock_session_store):
    """Test that passing failed_tiers=['TIER_1_GLOBAL'] fails Tier 1 and falls back to Tier 2."""
    result = await router.execute_turn(
        session_state=mock_session_store,
        prompt="Trigger tier 1 failure checkbox.",
        failed_tiers=["TIER_1_GLOBAL"],
    )

    metadata = result["executionMetadata"]
    assert metadata["activeTier"] == "TIER_2_REGIONAL"
    assert metadata["failoverOccurred"] is True
    assert metadata["failoverHops"] == 1
    assert "australia-southeast1" in metadata["executionLocation"]
    assert len(metadata["failoverLog"]) == 2
    assert "404 NotFound" in metadata["failoverLog"][0]["error"]


@pytest.mark.asyncio
async def test_multi_tier_failure_checkboxes(router, mock_session_store):
    """Test that passing failed_tiers=['TIER_1_GLOBAL', 'TIER_2_REGIONAL'] cascades to Tier 3."""
    result = await router.execute_turn(
        session_state=mock_session_store,
        prompt="Trigger multi-tier failure checkboxes.",
        failed_tiers=["TIER_1_GLOBAL", "TIER_2_REGIONAL"],
    )

    metadata = result["executionMetadata"]
    assert metadata["activeTier"] == "TIER_3_SOVEREIGN"
    assert metadata["failoverOccurred"] is True
    assert metadata["failoverHops"] == 2
    assert "Private VPC" in metadata["executionLocation"]
    assert len(metadata["failoverLog"]) == 3
    assert "404 NotFound" in metadata["failoverLog"][0]["error"]
    assert "404 NotFound" in metadata["failoverLog"][1]["error"]


@pytest.mark.asyncio
async def test_get_gcp_bearer_token_caching():
    """Test that get_gcp_bearer_token caches credentials and avoids repeated google.auth.default calls."""
    import src.adk.cascade_router as router_module
    from unittest.mock import MagicMock

    router_module._CACHED_CREDS = None
    router_module._CACHED_PROJECT = None

    mock_creds = MagicMock()
    mock_creds.valid = True
    mock_creds.token = "fake-oauth-token-123"

    with patch("google.auth.default", return_value=(mock_creds, "test-gcp-project")) as mock_default:
        token1, project1 = await router_module.get_gcp_bearer_token()
        token2, project2 = await router_module.get_gcp_bearer_token()

    assert token1 == "fake-oauth-token-123"
    assert project1 == "test-gcp-project"
    assert token2 == "fake-oauth-token-123"
    assert project2 == "test-gcp-project"
    mock_default.assert_called_once()


def test_strip_sovereign_header_helper():
    """Verify that strip_sovereign_header removes single and duplicated sovereign enclave banners."""
    from src.adk.schema_adapter import strip_sovereign_header

    single_header_text = (
        "[SOVEREIGN ENCLAVE // GOOGLE/GEMMA-2-2B-IT] Processed completely within isolated VPC (AU-SYD). "
        "All data remained within air-gapped memory buffers with zero external egress.\n\n"
        "1 + 1 = 2"
    )
    assert strip_sovereign_header(single_header_text) == "1 + 1 = 2"

    double_header_text = (
        "[SOVEREIGN ENCLAVE // GOOGLE/GEMMA-2-2B-IT] Processed completely within isolated VPC (AU-SYD). "
        "All data remained within air-gapped memory buffers with zero external egress.\n\n"
        "[SOVEREIGN ENCLAVE // GOOGLE/GEMMA-2-2B-IT] Processed completely within isolated VPC (AU-SYD). "
        "All data remained within air-gapped memory buffers with zero external egress.\n\n"
        "Your favorite cat is a **tabby**."
    )
    assert strip_sovereign_header(double_header_text) == "Your favorite cat is a **tabby**."


@pytest.mark.asyncio
async def test_multi_turn_context_handoff_local_to_global():
    """Verify multi-turn context handoff from local Tier 3 to global Tier 1 without banner duplication."""
    from src.adk.base_agent import SovereignResilientAgent

    agent = SovereignResilientAgent()
    session_state = {"session_id": "test-context-handoff", "stickyTier": "TIER_1_GLOBAL", "messages": []}

    # Turn 1: User says 'I love eagles.....' on Tier 3 (Airgap VPC)
    res1 = await agent.run(
        session_state=session_state,
        prompt="I love eagles.....",
        forced_tier="TIER_3_SOVEREIGN",
    )
    assert res1["executionMetadata"]["activeTier"] == "TIER_3_SOVEREIGN"
    assert "[SOVEREIGN ENCLAVE //" in res1["content"]

    # Verify session history stored clean text without [SOVEREIGN ENCLAVE // ...] banner pollution
    assert len(session_state["messages"]) == 2
    assert "[SOVEREIGN ENCLAVE //" not in session_state["messages"][1]["content"]

    # Turn 2: User asks follow-up on Tier 1 Global
    res2 = await agent.run(
        session_state=session_state,
        prompt="tell me more about my favourite bird",
        forced_tier="TIER_1_GLOBAL",
    )
    assert res2["executionMetadata"]["activeTier"] == "TIER_1_GLOBAL"
    assert "[SOVEREIGN ENCLAVE //" not in res2["content"]
    assert "eagle" in res2["content"].lower()




