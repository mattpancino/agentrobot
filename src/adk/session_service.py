# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Universal Geopolitical AI Failover Demo
"""
Pluggable Session Service for Universal Sovereign ADK Agents.

Provides a unified interface for storing and retrieving:
1. Shared conversation transcripts and operational routing state ('stickyTier').
2. Namespaced private agent memory stores ('private:<agent_name>:<session_id>')
   to isolate internal reasoning, scratchpads, and domain calculations across
   specialized subagents.

Supports InMemorySessionService for instant local/demo execution and provides
a pluggable interface for production VPC backends (e.g. RedisSessionService).
"""

import json
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod


class SessionService(ABC):
    """Abstract interface for Sovereign ADK Session and Memory Storage."""

    @abstractmethod
    async def get_session(self, session_id: str) -> Dict[str, Any]:
        """Fetch shared conversation context and sticky routing state."""
        pass

    @abstractmethod
    async def save_session(self, session_id: str, state: Dict[str, Any]) -> None:
        """Persist shared conversation context and sticky routing state."""
        pass

    @abstractmethod
    async def get_private_memory(self, session_id: str, agent_name: str) -> Dict[str, Any]:
        """Fetch private scratchpad memory scoped exclusively to the specified agent."""
        pass

    @abstractmethod
    async def save_private_memory(
        self, session_id: str, agent_name: str, data: Dict[str, Any]
    ) -> None:
        """Persist private scratchpad memory scoped exclusively to the specified agent."""
        pass


class InMemorySessionService(SessionService):
    """
    In-memory implementation of SessionService for zero-dependency local execution
    and rapid prototyping.

    Stores shared session documents and private agent memory in independent
    namespaces to enforce security isolation.
    """

    def __init__(self, initial_store: Optional[Dict[str, Dict[str, Any]]] = None):
        # Key: "session:<session_id>" or "private:<agent_name>:<session_id>"
        self._store: Dict[str, Dict[str, Any]] = initial_store if initial_store is not None else {}

    async def get_session(self, session_id: str) -> Dict[str, Any]:
        key = f"session:{session_id}"
        if key not in self._store:
            self._store[key] = {
                "session_id": session_id,
                "stickyTier": "TIER_1_GLOBAL",
                "messages": [],
            }
        return self._store[key]

    async def save_session(self, session_id: str, state: Dict[str, Any]) -> None:
        key = f"session:{session_id}"
        self._store[key] = state

    async def get_private_memory(self, session_id: str, agent_name: str) -> Dict[str, Any]:
        key = f"private:{agent_name}:{session_id}"
        if key not in self._store:
            self._store[key] = {}
        return self._store[key]

    async def save_private_memory(
        self, session_id: str, agent_name: str, data: Dict[str, Any]
    ) -> None:
        key = f"private:{agent_name}:{session_id}"
        self._store[key] = data


class RedisSessionService(SessionService):
    """
    Production-ready Redis/Valkey SessionService for private VPC enclaves.

    Allows hundreds of independent agent containers to share context windows
    and maintain private namespaced memory stores without a central server.
    """

    def __init__(self, redis_client: Any):
        self.redis = redis_client
        self.ttl_seconds = 86400  # 24 hours default expiry

    async def get_session(self, session_id: str) -> Dict[str, Any]:
        key = f"session:{session_id}"
        raw = await self.redis.get(key)
        if not raw:
            default_state = {
                "session_id": session_id,
                "stickyTier": "TIER_1_GLOBAL",
                "messages": [],
            }
            return default_state
        return json.loads(raw) if isinstance(raw, str) else json.loads(raw.decode("utf-8"))

    async def save_session(self, session_id: str, state: Dict[str, Any]) -> None:
        key = f"session:{session_id}"
        payload = json.dumps(state)
        await self.redis.set(key, payload, ex=self.ttl_seconds)

    async def get_private_memory(self, session_id: str, agent_name: str) -> Dict[str, Any]:
        key = f"private:{agent_name}:{session_id}"
        raw = await self.redis.get(key)
        if not raw:
            return {}
        return json.loads(raw) if isinstance(raw, str) else json.loads(raw.decode("utf-8"))

    async def save_private_memory(
        self, session_id: str, agent_name: str, data: Dict[str, Any]
    ) -> None:
        key = f"private:{agent_name}:{session_id}"
        payload = json.dumps(data)
        await self.redis.set(key, payload, ex=self.ttl_seconds)
