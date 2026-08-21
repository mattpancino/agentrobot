# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Universal Geopolitical AI Failover Demo
"""
Declarative Tool Registry and Schema Extraction for Sovereign-Stream ADK.

Allows developers to pass standard type-annotated Python functions into an agent
(`tools=[my_func]`). The runtime automatically extracts JSON Schemas compatible with
Vertex AI / Gemini Function Declarations and executes tool calls safely.
"""

import inspect
from typing import Any, Callable, Dict, List, Optional, Union, get_type_hints


def _python_type_to_json_schema_type(py_type: Any) -> str:
    """Maps Python type annotations to JSON Schema type strings."""
    if py_type == str:
        return "string"
    elif py_type == int:
        return "integer"
    elif py_type == float:
        return "number"
    elif py_type == bool:
        return "boolean"
    elif py_type == list or getattr(py_type, "__origin__", None) == list:
        return "array"
    elif py_type == dict or getattr(py_type, "__origin__", None) == dict:
        return "object"
    return "string"


def extract_tool_schema(func: Callable) -> Dict[str, Any]:
    """
    Extracts a standard Vertex AI / Gemini FunctionDeclaration schema from a Python function.

    Args:
        func: A typed Python callable with an optional docstring.

    Returns:
        Dictionary conforming to standard function declaration schema:
        {
            "name": "function_name",
            "description": "Function description...",
            "parameters": {
                "type": "object",
                "properties": {
                    "param_name": {"type": "string", "description": "..."}
                },
                "required": ["param_name"]
            }
        }
    """
    name = getattr(func, "__name__", "unknown_tool")
    docstring = inspect.getdoc(func) or f"Executes {name}"
    # Use first line or entire docstring as description
    description = docstring.split("\n")[0].strip()

    sig = inspect.signature(func)
    try:
        type_hints = get_type_hints(func)
    except Exception:
        type_hints = {}

    properties: Dict[str, Dict[str, Any]] = {}
    required: List[str] = []

    for param_name, param in sig.parameters.items():
        if param_name in ("self", "cls"):
            continue

        param_type = type_hints.get(param_name, param.annotation)
        if param_type == inspect.Parameter.empty:
            param_type = str

        schema_type = _python_type_to_json_schema_type(param_type)
        properties[param_name] = {
            "type": schema_type,
            "description": f"Parameter '{param_name}' of type {schema_type}",
        }

        if param.default == inspect.Parameter.empty:
            required.append(param_name)

    return {
        "name": name,
        "description": description,
        "parameters": {
            "type": "object",
            "properties": properties,
            "required": required,
        },
    }


def extract_tools_schemas(tools: List[Callable]) -> List[Dict[str, Any]]:
    """Converts a list of Python callables into a list of tool schema dictionaries."""
    return [extract_tool_schema(t) for t in tools if callable(t)]


async def execute_tool_call(
    tools: List[Callable], tool_name: str, args: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Safely executes a registered tool by name with parameter validation and error handling.

    Args:
        tools: List of developer-registered Python callables.
        tool_name: The name of the function to invoke.
        args: Keyword arguments dictionary for the function.

    Returns:
        Structured execution result dictionary containing 'toolName', 'result', and 'error'.
    """
    target_tool: Optional[Callable] = None
    for t in tools:
        if getattr(t, "__name__", "") == tool_name:
            target_tool = t
            break

    if not target_tool:
        return {
            "toolName": tool_name,
            "result": None,
            "error": f"Tool '{tool_name}' is not registered in this agent.",
        }

    try:
        if inspect.iscoroutinefunction(target_tool):
            result = await target_tool(**args)
        else:
            result = target_tool(**args)
        return {
            "toolName": tool_name,
            "result": result,
            "error": None,
        }
    except Exception as exc:
        return {
            "toolName": tool_name,
            "result": None,
            "error": f"Tool execution failed: {str(exc)}",
        }
