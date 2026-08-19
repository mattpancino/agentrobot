# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Resilient Multi-Tier AI Failover Demo
"""
ADK Sovereign-Stream package: Provides 3-tier resilient cascade routing,
sticky failover demotion, schema adaptation, background recovery sentinels,
and enterprise base agents for Google Agent Development Kit (ADK) applications.
"""

from .schema_adapter import normalize_messages_for_gemma
from .cascade_router import SovereignCascadeRouter, TierConfig, FailoverHopLog, ExecutionMetadata
from .base_agent import SovereignResilientAgent, SovereigntyPolicy
from .recovery_sentinel import RecoverySentinel

__all__ = [
    "normalize_messages_for_gemma",
    "SovereignCascadeRouter",
    "TierConfig",
    "FailoverHopLog",
    "ExecutionMetadata",
    "SovereignResilientAgent",
    "SovereigntyPolicy",
    "RecoverySentinel",
]
