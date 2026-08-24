# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Universal Geopolitical AI Failover Demo
"""
Enterprise SovereignResilientAgent Base Class (Parent Agent Framework).

Serves as the enterprise standard base class for Universal Google ADK applications.
Product teams subclass this to inherit automated 3-tier cascade routing,
sticky failover demotion, jurisdictional regional binding, and Recovery Sentinel
probing without writing any infrastructure or failover boilerplate.

Supports:
- Pluggable SessionService (InMemory, Redis, ReplicatingSessionService).
- Namespaced Private Memory stores per agent.
- Seamless subagent delegation via sessionId.
- Declarative type-annotated tool calling with automatic execution.
"""

from enum import Enum
from typing import Any, Callable, Dict, List, Optional
from .cascade_router import SovereignCascadeRouter
from .schema_adapter import strip_sovereign_header
from .session_service import InMemorySessionService, SessionService
from .tool_registry import execute_tool_call, extract_tools_schemas


class SovereigntyPolicy(str, Enum):
    """Universal sovereignty compliance constraint enforced on an agent."""
    GLOBAL_CASCADE = "GLOBAL_CASCADE"                          # Default 3-tier cascade
    JURISDICTIONAL_OR_AIRGAP = "JURISDICTIONAL_OR_AIRGAP"      # Bypasses Global Tier 1
    AU_SYD_REGIONAL_OR_AIRGAP = "AU_SYD_REGIONAL_OR_AIRGAP"    # Legacy alias
    STRICT_AIRGAP_VPC_ONLY = "STRICT_AIRGAP_VPC_ONLY"          # Locks to Tier 3 VPC Enclave


class SovereignResilientAgent:
    """
    Standard Universal Enterprise Base Agent & Parent Orchestrator.

    Wraps Google ADK session lifecycle, pluggable memory isolation, declarative
    tool calling, and multi-tier sovereign cascade routing across any country
    or jurisdictional boundary.
    """

    def __init__(
        self,
        name: str = "sovereign_resilient_agent",
        description: str = "Enterprise agent with universal multi-tier sovereign failover capability.",
        instruction: str = "You are a helpful and intelligent AI assistant.",
        tools: Optional[List[Callable]] = None,
        sovereignty_policy: SovereigntyPolicy = SovereigntyPolicy.GLOBAL_CASCADE,
        t1_model: str = "gemini-3.7-flash",
        t2_model: str = "gemini-2.5-flash",
        t3_model: str = "google/gemma-2-2b-it",
        session_service: Optional[SessionService] = None,
    ):
        self.name = name
        self.description = description
        self.instruction = instruction
        self.tools: List[Callable] = tools or []
        self.sovereignty_policy = sovereignty_policy
        self.router = SovereignCascadeRouter(
            t1_model=t1_model,
            t2_model=t2_model,
            t3_model=t3_model,
        )
        self.session_service: SessionService = (
            session_service if session_service is not None else InMemorySessionService()
        )

    def enforce_policy_on_session(self, session_state: Dict[str, Any]) -> str:
        """Calculates the forced tier based on the agent's SovereigntyPolicy."""
        if self.sovereignty_policy in (
            SovereigntyPolicy.JURISDICTIONAL_OR_AIRGAP,
            SovereigntyPolicy.AU_SYD_REGIONAL_OR_AIRGAP,
        ):
            return "TIER_2_REGIONAL"
        elif self.sovereignty_policy == SovereigntyPolicy.STRICT_AIRGAP_VPC_ONLY:
            return "TIER_3_SOVEREIGN"
        return "AUTO"

    async def call_tool(self, tool_name: str, **kwargs: Any) -> Dict[str, Any]:
        """
        Executes a registered tool by name with keyword arguments.
        Returns a structured dictionary with 'toolName', 'result', and 'error'.
        """
        return await execute_tool_call(self.tools, tool_name, kwargs)

    def get_tool_schemas(self) -> List[Dict[str, Any]]:
        """Returns Vertex AI / Gemini compatible function declaration schemas for all tools."""
        return extract_tools_schemas(self.tools)

    async def read_private_memory(self, session_id: str) -> Dict[str, Any]:
        """
        Reads private scratchpad memory scoped exclusively to this agent's namespace.
        Other agents collaborating on the same session cannot read or overwrite this data.
        """
        return await self.session_service.get_private_memory(
            session_id=session_id, agent_name=self.name
        )

    async def write_private_memory(self, session_id: str, data: Dict[str, Any]) -> None:
        """Writes private scratchpad memory scoped exclusively to this agent's namespace."""
        await self.session_service.save_private_memory(
            session_id=session_id, agent_name=self.name, data=data
        )

    async def delegate(
        self,
        subagent: "SovereignResilientAgent",
        session_id: str,
        prompt: str,
        inject_mock_failure: bool = False,
        failed_tiers: Optional[List[str]] = None,
        forced_tier: str = "AUTO",
        tier_settings: Optional[Dict[str, Any]] = None,
        enable_pii_tokenizer: bool = False,
        tools: Optional[List[Callable]] = None,
    ) -> Dict[str, Any]:
        """
        Parent Agent capability: Delegate execution to a specialized subagent by passing
        only the session_id and a scoped prompt.

        The subagent automatically shares the active session_state (including stickyTier
        and replicating storage connection) and executes within its own private namespace.
        """
        subagent.session_service = self.session_service

        session_state = await self.session_service.get_session(session_id)
        return await subagent.run(
            session_state=session_state,
            prompt=prompt,
            inject_mock_failure=inject_mock_failure,
            failed_tiers=failed_tiers,
            forced_tier=forced_tier,
            tier_settings=tier_settings,
            enable_pii_tokenizer=enable_pii_tokenizer,
            tools=tools,
        )

    async def run(
        self,
        session_state: Dict[str, Any],
        prompt: str,
        inject_mock_failure: bool = False,
        failed_tiers: Optional[List[str]] = None,
        forced_tier: str = "AUTO",
        tier_settings: Optional[Dict[str, Any]] = None,
        enable_pii_tokenizer: bool = False,
        tools: Optional[List[Callable]] = None,
    ) -> Dict[str, Any]:
        """
        Executes a turn through the resilient sovereign cascade router with declarative tools.
        """
        session_id = session_state.get("session_id", session_state.get("sessionId", "default-session"))

        effective_forced_tier = forced_tier
        if effective_forced_tier == "AUTO":
            effective_forced_tier = self.enforce_policy_on_session(session_state)

        effective_tools = tools if tools is not None else self.tools

        result = await self.router.execute_turn(
            session_state=session_state,
            prompt=prompt,
            system_instruction=self.instruction,
            inject_mock_failure=inject_mock_failure,
            failed_tiers=failed_tiers,
            forced_tier=effective_forced_tier,
            tier_settings=tier_settings,
            tools=effective_tools,
            enable_pii_tokenizer=enable_pii_tokenizer,
        )

        # Append assistant turn to cleartext session history
        if "messages" not in session_state:
            session_state["messages"] = []
        session_state["messages"].append({"role": "user", "content": prompt})
        session_state["messages"].append(
            {
                "role": "model",
                "content": strip_sovereign_header(result["content"]),
                "executingAgent": self.name,
                "servedByTier": result.get("executionMetadata", {}).get("activeTier", "TIER_1_GLOBAL"),
            }
        )

        # Parallel Tokenized Context Window
        if "tokenized_messages" not in session_state:
            session_state["tokenized_messages"] = []

        tokenized_prompt = result.get("executionMetadata", {}).get("tokenizedPrompt") or prompt
        tokenized_resp = result.get("tokenizedContent") or strip_sovereign_header(result["content"])

        session_state["tokenized_messages"].append({"role": "user", "content": tokenized_prompt})
        session_state["tokenized_messages"].append(
            {
                "role": "model",
                "content": tokenized_resp,
                "executingAgent": self.name,
                "servedByTier": result.get("executionMetadata", {}).get("activeTier", "TIER_1_GLOBAL"),
            }
        )

        # Persist updated session state back to session service
        await self.session_service.save_session(session_id, session_state)

        return result
