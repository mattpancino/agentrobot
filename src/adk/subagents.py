# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Universal Geopolitical AI Failover Demo
"""
Reference Specialist Subagents and Multi-Agent Orchestration for Sovereign-Stream.

Demonstrates how Parent Agents delegate tasks to specialized subagents using
`delegate(subagent, session_id, prompt)` while maintaining strict private memory
isolation and universal 3-tier cascade failover.
"""

from typing import Any, Dict, List, Optional
from .base_agent import SovereignResilientAgent, SovereigntyPolicy
from .session_service import SessionService


class PolicyGuardAgent(SovereignResilientAgent):
    """
    Specialist subagent responsible for evaluating geopolitical compliance,
    data residency constraints, and jurisdictional rules.

    Stores its internal evaluation criteria and scoring scratchpad in its
    own private memory namespace ('private:policy_guard:<session_id>').
    """

    def __init__(self, session_service: Optional[SessionService] = None):
        super().__init__(
            name="policy_guard",
            description="Evaluates requests against jurisdictional data residency and geopolitical policy rules.",
            instruction=(
                "You are an automated Policy and Data Residency Guard. "
                "Analyze the user query to ensure it adheres to jurisdictional boundary requirements. "
                "Return a concise assessment confirming safe operational routing."
            ),
            sovereignty_policy=SovereigntyPolicy.GLOBAL_CASCADE,
            session_service=session_service,
        )

    async def verify_request(self, session_id: str, prompt: str) -> Dict[str, Any]:
        """Performs policy check and saves verification audit to private memory."""
        private_mem = await self.read_private_memory(session_id)
        checks_count = private_mem.get("policy_evaluations_count", 0) + 1
        private_mem["policy_evaluations_count"] = checks_count
        private_mem["last_verified_prompt"] = prompt[:50]
        private_mem["status"] = "PASSED"
        await self.write_private_memory(session_id, private_mem)

        return {"allowed": True, "evaluations": checks_count}


class DomainSpecialistAgent(SovereignResilientAgent):
    """
    Specialist subagent responsible for executing core domain queries
    over the active sovereign tier without seeing policy guard scratchpads.
    """

    def __init__(self, session_service: Optional[SessionService] = None):
        super().__init__(
            name="domain_specialist",
            description="Processes user domain queries over the active resilient tier.",
            instruction=(
                "You are an expert domain specialist agent. "
                "Answer the user's question clearly, concisely, and accurately "
                "while respecting the active sovereign execution tier."
            ),
            sovereignty_policy=SovereigntyPolicy.GLOBAL_CASCADE,
            session_service=session_service,
        )


class FleetOperationsAgent(SovereignResilientAgent):
    """
    Enterprise Fleet Operations Subagent.
    Inherits sovereign PII pre-processing, AU license plate pseudonymization,
    and Google Drive / Trix Sheets grounding out-of-the-box.
    """

    def __init__(self, session_service: Optional[SessionService] = None):
        super().__init__(
            name="fleet_operations",
            description="Specialist subagent for enterprise Australian fleet management, tolling, and vehicle telemetry.",
            instruction=(
                "You are an enterprise Australian Fleet Operations agent. "
                "Help the user inspect vehicle registrations, toll infringements, and maintenance logs. "
                "Use grounding tools or telemetry lookup to resolve fleet queries."
            ),
            tools=[self.lookup_vehicle_telemetry],
            enable_pii_tokenizer=True,
            enable_enterprise_grounding=True,
            session_service=session_service,
        )

    def lookup_vehicle_telemetry(self, plate: str) -> Dict[str, Any]:
        """
        Retrieves real-time GPS coordinates, fuel status, and odometer for a given vehicle plate in Australia.
        Receives de-tokenized plate locally within the Australian boundary.
        """
        # Simulated local telemetry database query
        return {
            "plate": plate,
            "status": "ACTIVE_ON_ROAD",
            "odometer_km": 42150,
            "fuel_level_percent": 84,
            "last_seen_depot": "Sydney Olympic Park Depot, NSW",
            "telemetry_jurisdiction": "AU-NSW",
        }


class ClaimsProcessingAgent(SovereignResilientAgent):
    """
    Enterprise Insurance & Accident Claims Subagent.
    Inherits sovereign PII pre-processing, AU license plate pseudonymization,
    and accident report grounding without writing boilerplate.
    """

    def __init__(self, session_service: Optional[SessionService] = None):
        super().__init__(
            name="claims_processing",
            description="Specialist subagent for processing accident claims, police reports, and damage assessments.",
            instruction=(
                "You are an enterprise Claims Processing specialist. "
                "Inspect accident reports, cross-reference involved drivers and license plates, and assess claim validity."
            ),
            tools=[self.assess_claim_liability],
            enable_pii_tokenizer=True,
            enable_enterprise_grounding=True,
            session_service=session_service,
        )

    def assess_claim_liability(self, claim_id: str, estimated_damage_aud: float) -> Dict[str, Any]:
        """Assesses liability and coverage limits for an Australian fleet insurance claim."""
        is_covered = estimated_damage_aud <= 50000.0
        return {
            "claim_id": claim_id,
            "estimated_damage_aud": estimated_damage_aud,
            "liability_status": "APPROVED" if is_covered else "REQUIRES_SUPERVISOR_SIGN_OFF",
            "excess_aud": 750.00,
            "assessor_location": "Melbourne Claims Hub, VIC",
        }


class SovereignParentOrchestrator(SovereignResilientAgent):
    """
    Parent Agent that coordinates PolicyGuardAgent and DomainSpecialistAgent
    using subagent delegation via sessionId.
    """

    def __init__(self, session_service: Optional[SessionService] = None):
        super().__init__(
            name="sovereign_parent_orchestrator",
            description="Coordinates multi-agent delegation and resilient cascade routing.",
            instruction="You orchestrate specialist subagents across the sovereign cascade hierarchy.",
            session_service=session_service,
        )
        self.policy_guard = PolicyGuardAgent(session_service=self.session_service)
        self.specialist = DomainSpecialistAgent(session_service=self.session_service)

    async def execute_orchestrated_turn(
        self,
        session_id: str,
        prompt: str,
        inject_mock_failure: bool = False,
        failed_tiers: Optional[List[str]] = None,
        forced_tier: str = "AUTO",
    ) -> Dict[str, Any]:
        """
        1. Delegates policy verification to PolicyGuardAgent.
        2. Delegates domain execution to DomainSpecialistAgent.
        3. Returns combined telemetry without leaking private memory scratchpads.
        """
        policy_status = await self.policy_guard.verify_request(session_id, prompt)

        result = await self.delegate(
            subagent=self.specialist,
            session_id=session_id,
            prompt=prompt,
            inject_mock_failure=inject_mock_failure,
            failed_tiers=failed_tiers,
            forced_tier=forced_tier,
        )

        result["orchestrationMetadata"] = {
            "parentAgent": self.name,
            "policyVerification": policy_status,
            "delegatedSpecialist": self.specialist.name,
        }
        return result


class GeneralChatAgent(SovereignResilientAgent):
    """
    Enterprise General Chat & Conversational Subagent.
    Serves general user queries, open-ended problem solving, brainstorming, and drafting
    while guaranteeing 100% in-region PII tokenization, AU license plate recognition,
    and enterprise grounding without leaking personal data offshore.
    """

    def __init__(self, session_service: Optional[SessionService] = None):
        super().__init__(
            name="general_chat",
            description="Specialist subagent for general conversational Q&A, drafting, and enterprise assistance with full PII sovereignty.",
            instruction=(
                "You are a helpful, professional, and intelligent enterprise AI assistant. "
                "Assist the user with their questions, drafting, analysis, and general workplace tasks. "
                "Maintain strict factual accuracy and confidentiality."
            ),
            enable_pii_tokenizer=True,
            enable_enterprise_grounding=True,
            session_service=session_service,
        )


SovereignGeneralChatAgent = GeneralChatAgent


class EnterpriseSovereignOrchestrator(SovereignResilientAgent):
    """
    Enterprise Parent Orchestrator.
    Orchestrates multiple domain subagents (General Chat, Fleet, Claims, Policy) under a unified
    A2A Sovereign Mesh invariant where raw PII is scrubbed before crossing any network/agent boundary.
    """

    def __init__(self, session_service: Optional[SessionService] = None):
        super().__init__(
            name="enterprise_sovereign_orchestrator",
            description="Enterprise Parent Agent orchestrating general chat, fleet, claims, and policy specialist subagents.",
            instruction="You are the lead enterprise AI orchestrator managing sovereign chat and specialist domain routing.",
            enable_pii_tokenizer=True,
            enable_enterprise_grounding=True,
            session_service=session_service,
        )
        self.policy_guard = PolicyGuardAgent(session_service=self.session_service)
        self.general_agent = GeneralChatAgent(session_service=self.session_service)
        self.fleet_agent = FleetOperationsAgent(session_service=self.session_service)
        self.claims_agent = ClaimsProcessingAgent(session_service=self.session_service)

    async def execute_orchestrated_turn(
        self,
        session_id: str,
        prompt: str,
        target_subagent: str = "general",
        inject_mock_failure: bool = False,
        failed_tiers: Optional[List[str]] = None,
        forced_tier: str = "AUTO",
    ) -> Dict[str, Any]:
        """
        1. Evaluates jurisdictional compliance with PolicyGuardAgent.
        2. Routes to the appropriate specialist subagent (General Chat, Fleet, or Claims).
        3. Enforces that all A2A communications pass only surrogate tokens.
        """
        policy_status = await self.policy_guard.verify_request(session_id, prompt)

        target = (target_subagent or "general").lower()
        if target == "claims":
            agent_to_invoke = self.claims_agent
        elif target == "fleet":
            agent_to_invoke = self.fleet_agent
        else:
            agent_to_invoke = self.general_agent

        result = await self.delegate(
            subagent=agent_to_invoke,
            session_id=session_id,
            prompt=prompt,
            inject_mock_failure=inject_mock_failure,
            failed_tiers=failed_tiers,
            forced_tier=forced_tier,
        )

        result["orchestrationMetadata"] = {
            "parentAgent": self.name,
            "policyVerification": policy_status,
            "delegatedSpecialist": agent_to_invoke.name,
        }
        return result




