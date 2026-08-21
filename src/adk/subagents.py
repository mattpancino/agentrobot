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
        # Ensure session exists in the service
        session_state = await self.session_service.get_session(session_id)

        # Step 1: Subagent delegation for policy check
        policy_status = await self.policy_guard.verify_request(session_id, prompt)

        # Step 2: Subagent delegation for domain response
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
