# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Resilient Multi-Tier AI Failover Demo
"""
Schema Adapter for Sovereign-Stream.

Transforms and normalizes message history across distinct model families:
- Converts Google GenAI / Gemini roles (`model`, `user`) into OpenAI / vLLM / Ollama
  compatible chat completion roles (`assistant`, `user`, `system`) required by
  self-hosted Gemma 2 instances.
- Handles system instruction injection without dropping prior conversation context.
"""

from typing import List, Dict, Any, Optional


def normalize_messages_for_gemma(
    messages: List[Dict[str, Any]],
    system_prompt: Optional[str] = None
) -> List[Dict[str, str]]:
    """
    Translates Google GenAI / Gemini conversation history into an OpenAI/vLLM
    compatible schema for self-hosted Gemma 2 models.

    Args:
        messages: List of message dictionaries or ADK event objects with 'role' and 'content'.
        system_prompt: Optional system instruction to prepend if not already present.

    Returns:
        List of normalized message dictionaries formatted as:
        [{"role": "system"|"user"|"assistant", "content": "..."}]
    """
    normalized: List[Dict[str, str]] = []

    # 1. Prepend system prompt if supplied
    if system_prompt:
        normalized.append({
            "role": "system",
            "content": system_prompt.strip()
        })

    # 2. Iterate through conversation history
    for msg in messages:
        if isinstance(msg, dict):
            raw_role = str(msg.get("role", "user")).lower()
            content = str(msg.get("content", "")).strip()
        else:
            raw_role = str(getattr(msg, "role", "user")).lower()
            content = str(getattr(msg, "content", "")).strip()

        if not content:
            continue

        # Map Gemini 'model' role to OpenAI/Gemma 'assistant' role
        if raw_role == "model":
            target_role = "assistant"
        elif raw_role in ("user", "system", "assistant"):
            target_role = raw_role
        else:
            target_role = "user"

        normalized.append({
            "role": target_role,
            "content": content
        })

    return normalized
