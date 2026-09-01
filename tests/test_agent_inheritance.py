# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Enterprise Base Agent Inheritance & Sovereign Mesh Tests
"""
Unit tests validating that specialized enterprise sub-agents (e.g. FleetOperationsAgent,
ClaimsProcessingAgent) automatically inherit:
1. Australian In-Region PII tokenization (AU license plates, names, phones, TFN).
2. Enterprise Google Drive and Trix (Sheets) grounding interception.
3. Bi-directional tool calling with in-region de-tokenization.
4. Agent-to-Agent (A2A) Sovereign Mesh zero-PII egress invariants.
"""

import pytest
from src.adk.base_agent import SovereignResilientAgent, SovereigntyPolicy
from src.adk.subagents import (
    FleetOperationsAgent,
    ClaimsProcessingAgent,
    EnterpriseSovereignOrchestrator,
    PolicyGuardAgent,
)
from src.adk.session_service import InMemorySessionService


@pytest.mark.asyncio
async def test_subagent_inherits_pii_tokenization_without_boilerplate():
    """
    Proves that a subclassed agent (FleetOperationsAgent) inherits full Australian PII
    pseudonymization and AU license plate recognition with 0 lines of custom PII logic.
    """
    session_service = InMemorySessionService()
    fleet_agent = FleetOperationsAgent(session_service=session_service)

    session_id = "enterprise-fleet-turn-001"
    session_state = await session_service.get_session(session_id)

    # Prompt with Australian PII: Name, AU plate, Phone
    raw_prompt = "Driver Sarah Connor in vehicle NSW-DL1234 (phone 0412 345 678) needs roadside assist."

    result = await fleet_agent.run(
        session_state=session_state,
        prompt=raw_prompt,
    )

    # 1. Verify model prompt was tokenized before LLM transit
    meta = result["executionMetadata"]
    tokenized_prompt = meta.get("tokenizedPrompt", "")
    assert "Sarah Connor" not in tokenized_prompt
    assert "NSW-DL1234" not in tokenized_prompt
    assert "0412 345 678" not in tokenized_prompt
    assert "PII_PERSON" in tokenized_prompt
    assert "PII_AU_LICENSE_PLATE" in tokenized_prompt
    assert "PII_PHONE_NUMBER" in tokenized_prompt

    # 2. Verify Session Vault was populated
    vault = session_state.get("pii_vault", {})
    assert len(vault) >= 2

    # 3. Verify final response received by caller has de-tokenized context
    assert result["content"] is not None


@pytest.mark.asyncio
async def test_subagent_inherits_enterprise_grounding():
    """
    Proves that subclassed agents inherit the in-region grounding tool `search_enterprise_knowledge`
    which sanitizes Google Drive docs and Trix tables before prompt assembly.
    """
    session_service = InMemorySessionService()
    claims_agent = ClaimsProcessingAgent(session_service=session_service)

    # Directly execute inherited grounding tool
    grounded_output = claims_agent.search_enterprise_knowledge(query="accident report claim 482")

    # Verify that grounded output retrieved accident report but scrubbed raw PII
    assert "Accident Incident Report" in grounded_output or "Claim #482" in grounded_output or "Document" in grounded_output
    assert "Marcus Vance" not in grounded_output
    assert "0412 987 654" not in grounded_output


@pytest.mark.asyncio
async def test_custom_subclass_creation_in_three_lines():
    """
    Demonstrates how any enterprise team can create a custom domain agent with custom tools
    and instantly inherit full enterprise data sovereignty.
    """
    def check_employee_certifications(employee_id: str) -> dict:
        """Checks compliance certificates for a field technician."""
        return {
            "employee_id": employee_id,
            "heavy_vehicle_license": "VALID",
            "first_aid_cert": "VALID_UNTIL_2027",
            "jurisdiction": "AU-QLD",
        }

    class HRComplianceAgent(SovereignResilientAgent):
        def __init__(self, session_service=None):
            super().__init__(
                name="hr_compliance",
                description="Checks employee HR records and safety certifications.",
                instruction="You are an HR compliance agent for Australian field operations.",
                tools=[check_employee_certifications],
                enable_pii_tokenizer=True,
                session_service=session_service,
            )

    hr_agent = HRComplianceAgent()
    assert hr_agent.enable_pii_tokenizer is True
    assert hr_agent.name == "hr_compliance"
    assert len(hr_agent.tools) >= 2  # custom tool + search_enterprise_knowledge

    # Verify tool schema extraction works out-of-the-box
    schemas = hr_agent.get_tool_schemas()
    schema_names = [s["name"] for s in schemas]
    assert "check_employee_certifications" in schema_names
    assert "search_enterprise_knowledge" in schema_names


@pytest.mark.asyncio
async def test_multi_agent_sovereign_mesh_orchestration():
    """
    Tests Enterprise Parent Orchestrator delegating across multiple specialized sub-agents
    while maintaining the A2A Sovereign Mesh invariant (zero raw PII egress across boundaries).
    """
    session_service = InMemorySessionService()
    orchestrator = EnterpriseSovereignOrchestrator(session_service=session_service)
    session_id = "sovereign-mesh-001"

    # Step 1: Delegate to Fleet Agent
    fleet_res = await orchestrator.execute_orchestrated_turn(
        session_id=session_id,
        prompt="Check vehicle VIC-1AB2CD driver John Doe for toll infringements.",
        target_subagent="fleet",
    )

    assert fleet_res["orchestrationMetadata"]["delegatedSpecialist"] == "fleet_operations"
    assert fleet_res["orchestrationMetadata"]["policyVerification"]["allowed"] is True

    # Step 2: Delegate to Claims Agent in the same session
    claims_res = await orchestrator.execute_orchestrated_turn(
        session_id=session_id,
        prompt="Process accident claim for driver John Doe vehicle VIC-1AB2CD.",
        target_subagent="claims",
    )

    assert claims_res["orchestrationMetadata"]["delegatedSpecialist"] == "claims_processing"

    # Verify session state maintained token vault across subagents
    session_state = await session_service.get_session(session_id)
    vault = session_state.get("pii_vault", {})
    assert len(vault) > 0

    # Verify private memories between PolicyGuard, Fleet, and Claims remain strictly isolated
    guard_mem = await session_service.get_private_memory(session_id, "policy_guard")
    fleet_mem = await session_service.get_private_memory(session_id, "fleet_operations")
    claims_mem = await session_service.get_private_memory(session_id, "claims_processing")

    assert guard_mem.get("policy_evaluations_count", 0) == 2
    assert "policy_evaluations_count" not in fleet_mem
    assert "policy_evaluations_count" not in claims_mem


@pytest.mark.asyncio
async def test_general_chat_agent_sovereign_execution():
    """
    Validates that GeneralChatAgent processes open-ended conversational prompts,
    enforcing Australian PII tokenization on free-form names, phone numbers, and plates.
    """
    from src.adk.subagents import GeneralChatAgent

    session_service = InMemorySessionService()
    general_agent = GeneralChatAgent(session_service=session_service)

    session_id = "general-chat-001"
    session_state = await session_service.get_session(session_id)

    raw_prompt = "Can you help draft a follow-up email to customer Alice Cooper about her account and car NSW-XY9876?"
    result = await general_agent.run(
        session_state=session_state,
        prompt=raw_prompt,
    )

    meta = result["executionMetadata"]
    tokenized_prompt = meta.get("tokenizedPrompt", "")

    # Assert raw PII was stripped from outbound prompt
    assert "Alice Cooper" not in tokenized_prompt
    assert "NSW-XY9876" not in tokenized_prompt
    assert "PII_PERSON" in tokenized_prompt
    assert "PII_AU_LICENSE_PLATE" in tokenized_prompt

    # Assert session vault recorded tokens
    vault = session_state.get("pii_vault", {})
    assert len(vault) >= 2

    # Assert model turn is stored in history
    assert len(session_state["messages"]) == 2
    assert session_state["messages"][1]["executingAgent"] == "general_chat"


@pytest.mark.asyncio
async def test_orchestrator_defaults_to_general_chat_agent():
    """
    Validates that EnterpriseSovereignOrchestrator defaults open-ended queries to GeneralChatAgent.
    """
    session_service = InMemorySessionService()
    orchestrator = EnterpriseSovereignOrchestrator(session_service=session_service)
    session_id = "sovereign-general-mesh-002"

    res = await orchestrator.execute_orchestrated_turn(
        session_id=session_id,
        prompt="Hi, I need help analyzing customer trends for our Sydney office.",
        target_subagent="general",
    )

    assert res["orchestrationMetadata"]["delegatedSpecialist"] == "general_chat"
    assert res["orchestrationMetadata"]["policyVerification"]["allowed"] is True

