# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Universal Geopolitical AI Failover Demo
"""
Unit tests for Declarative Tool Calling and Schema Extraction (AC-06).
"""

import pytest
from src.adk.base_agent import SovereignResilientAgent
from src.adk.session_service import InMemorySessionService
from src.adk.tool_registry import extract_tool_schema, execute_tool_call


def calculate_breach_sla(jurisdiction: str, breach_type: str = "data_breach") -> str:
    """Calculates the mandatory breach reporting window for a given jurisdiction."""
    if jurisdiction.upper() == "AU":
        return f"APRA CPS 234 requires {breach_type} notification within 72 hours."
    return f"Standard GDPR 72-hour notification applies for {breach_type}."


def test_extract_tool_schema():
    """Verify automatic Vertex AI / Gemini schema extraction from a typed Python function."""
    schema = extract_tool_schema(calculate_breach_sla)
    assert schema["name"] == "calculate_breach_sla"
    assert "Calculates the mandatory breach reporting window" in schema["description"]
    assert schema["parameters"]["type"] == "object"
    assert "jurisdiction" in schema["parameters"]["properties"]
    assert "breach_type" in schema["parameters"]["properties"]
    assert schema["parameters"]["required"] == ["jurisdiction"]


@pytest.mark.asyncio
async def test_agent_call_tool_directly():
    """Verify that an agent can directly execute its registered tools with validated arguments."""
    agent = SovereignResilientAgent(
        name="compliance_agent",
        tools=[calculate_breach_sla],
    )
    result = await agent.call_tool("calculate_breach_sla", jurisdiction="AU", breach_type="critical_outage")
    assert result["error"] is None
    assert result["toolName"] == "calculate_breach_sla"
    assert "APRA CPS 234 requires critical_outage notification within 72 hours." in result["result"]


@pytest.mark.asyncio
async def test_agent_run_with_tool_dispatch():
    """Verify that executing a turn on an agent with tools automatically dispatches tool calls."""
    session_service = InMemorySessionService()
    agent = SovereignResilientAgent(
        name="compliance_agent",
        tools=[calculate_breach_sla],
        session_service=session_service,
    )
    session_state = await session_service.get_session("test-tool-001")
    result = await agent.run(session_state=session_state, prompt="What is the breach SLA for jurisdiction AU?")

    assert "executionMetadata" in result
    tool_calls = result["executionMetadata"].get("toolCalls", [])
    assert len(tool_calls) > 0
    assert tool_calls[0]["toolName"] == "calculate_breach_sla"
    assert "72 hours" in str(tool_calls[0]["result"])
    # Tool summary should be appended to generated content
    assert "APRA CPS 234" in result["content"]


@pytest.mark.asyncio
async def test_unknown_or_failing_tool_call():
    """Verify that attempting to invoke an unregistered or failing tool returns a clean error payload."""
    def broken_tool(x: int) -> int:
        """A tool that raises an exception."""
        raise ValueError("Simulated tool crash")

    agent = SovereignResilientAgent(name="test_agent", tools=[broken_tool])

    res_missing = await agent.call_tool("nonexistent_tool")
    assert res_missing["error"] is not None
    assert "not registered" in res_missing["error"]

    res_broken = await agent.call_tool("broken_tool", x=10)
    assert res_broken["error"] is not None
    assert "Simulated tool crash" in res_broken["error"]
