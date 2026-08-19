# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Resilient Multi-Tier AI Failover Demo
"""
Enterprise SovereignResilientAgent Base Class.

Serves as the enterprise standard base class for Google ADK applications.
Product teams subclass this to inherit automated 3-tier cascade routing,
sticky failover demotion, AU-SYD regional Vertex AI binding, and Recovery Sentinel
probing without writing any infrastructure or failover boilerplate.
"""

from enum import Enum
from typing import Dict, Any, List, Optional
from .cascade_router import SovereignCascadeRouter


class SovereigntyPolicy(str, Enum):
    """Sovereignty compliance constraint enforced on an agent."""
    GLOBAL_CASCADE = "GLOBAL_CASCADE"                        # Default 3-tier cascade
    AU_SYD_REGIONAL_OR_AIRGAP = "AU_SYD_REGIONAL_OR_AIRGAP"  # Bypasses Global Tier 1
    STRICT_AIRGAP_VPC_ONLY = "STRICT_AIRGAP_VPC_ONLY"        # Locks to Tier 3 VPC Gemma


class SovereignResilientAgent:
    """
    Standard Enterprise Base Agent for Project Sovereign-Stream.

    Wraps Google ADK session lifecycle and multi-tier sovereign cascade routing.
    Subclasses only need to specify domain instructions, tools, and sovereignty policy.
    """

    def __init__(
        self,
        name: str = "sovereign_resilient_agent",
        description: str = "Enterprise agent with multi-tier sovereign failover capability.",
        instruction: str = (
            "You are an enterprise AI assistant adhering to strict Australian data residency "
            "and APRA CPS 234 compliance guidelines."
        ),
        tools: Optional[List[Any]] = None,
        sovereignty_policy: SovereigntyPolicy = SovereigntyPolicy.GLOBAL_CASCADE,
        t1_model: str = "gemini-1.5-pro-002",
        t2_model: str = "gemini-1.5-flash-002",
        t3_model: str = "google/gemma-2-2b-it",
    ):
        self.name = name
        self.description = description
        self.instruction = instruction
        self.tools = tools or []
        self.sovereignty_policy = sovereignty_policy
        self.router = SovereignCascadeRouter(
            t1_model=t1_model,
            t2_model=t2_model,
            t3_model=t3_model,
        )

    def enforce_policy_on_session(self, session_state: Dict[str, Any]) -> str:
        """
        Calculates the forced tier based on the agent's SovereigntyPolicy.
        """
        if self.sovereignty_policy == SovereigntyPolicy.AU_SYD_REGIONAL_OR_AIRGAP:
            return "TIER_2_REGIONAL"
        elif self.sovereignty_policy == SovereigntyPolicy.STRICT_AIRGAP_VPC_ONLY:
            return "TIER_3_SOVEREIGN"
        return "AUTO"

    async def run(
        self,
        session_state: Dict[str, Any],
        prompt: str,
        inject_mock_failure: bool = False,
        forced_tier: str = "AUTO",
        tier_settings: Optional[Dict[str, Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Executes a turn through the resilient sovereign cascade router.

        Args:
            session_state: ADK session state dictionary.
            prompt: User message prompt.
            inject_mock_failure: Fault injection flag for chaos testing.
            forced_tier: Manual override string or 'AUTO'.
            tier_settings: Optional custom regional model configuration per tier.

        Returns:
            Structured dictionary with response content and executionMetadata.
        """
        # Apply agent-level sovereignty constraint if no manual override passed
        effective_forced_tier = forced_tier
        if effective_forced_tier == "AUTO":
            effective_forced_tier = self.enforce_policy_on_session(session_state)

        result = await self.router.execute_turn(
            session_state=session_state,
            prompt=prompt,
            system_instruction=self.instruction,
            inject_mock_failure=inject_mock_failure,
            forced_tier=effective_forced_tier,
            tier_settings=tier_settings,
        )

        # Append assistant turn to session history to preserve conversation state
        if "messages" not in session_state:
            session_state["messages"] = []
        session_state["messages"].append({"role": "user", "content": prompt})
        session_state["messages"].append({"role": "model", "content": result["content"]})

        return result
