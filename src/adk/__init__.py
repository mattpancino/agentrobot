# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Resilient Multi-Tier AI Failover Demo
"""
ADK Sovereign-Stream package: Provides 3-tier resilient cascade routing,
sticky failover demotion, schema adaptation, background recovery sentinels,
declarative tool registry, replicating session storage, and enterprise base agents
for Google Agent Development Kit (ADK) applications.
"""

from .schema_adapter import normalize_messages_for_gemma
from .cascade_router import SovereignCascadeRouter, TierConfig, FailoverHopLog, ExecutionMetadata
from .base_agent import SovereignResilientAgent, SovereigntyPolicy
from .recovery_sentinel import RecoverySentinel
from .session_service import SessionService, InMemorySessionService, RedisSessionService, ReplicatingSessionService
from .loan_lvr_tool import (
    calculate_customer_lvr_and_serviceability,
    get_all_loan_customers,
    get_dataset_summary,
    ingest_loans_csv,
    reset_default_loans,
)

from .subagents import (
    GeneralChatAgent,
    SovereignGeneralChatAgent,
    FleetOperationsAgent,
    ClaimsProcessingAgent,
    PolicyGuardAgent,
    DomainSpecialistAgent,
    EnterpriseSovereignOrchestrator,
    SovereignParentOrchestrator,
)

__all__ = [
    "normalize_messages_for_gemma",
    "SovereignCascadeRouter",
    "TierConfig",
    "FailoverHopLog",
    "ExecutionMetadata",
    "SovereignResilientAgent",
    "SovereigntyPolicy",
    "RecoverySentinel",
    "SessionService",
    "InMemorySessionService",
    "RedisSessionService",
    "ReplicatingSessionService",
    "GeneralChatAgent",
    "SovereignGeneralChatAgent",
    "FleetOperationsAgent",
    "ClaimsProcessingAgent",
    "PolicyGuardAgent",
    "DomainSpecialistAgent",
    "EnterpriseSovereignOrchestrator",
    "SovereignParentOrchestrator",
    "extract_tool_schema",
    "extract_tools_schemas",
    "execute_tool_call",
    "calculate_customer_lvr_and_serviceability",
    "get_all_loan_customers",
    "get_dataset_summary",
    "ingest_loans_csv",
    "reset_default_loans",
]

