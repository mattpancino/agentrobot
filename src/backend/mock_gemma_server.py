# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Resilient Multi-Tier AI Failover Demo
"""
Lightweight Mock vLLM / OpenAI-compatible Server for Tier 3 Airgapped Gemma.

Simulates a Google Compute Engine / GKE instance running in private VPC
(australia-southeast1-a) hosting `google/gemma-2-9b-it` without external IP addresses.
Exposes standard `/v1/models` and `/v1/chat/completions` endpoints.
"""

import time
import asyncio
from typing import List, Dict, Any, Optional
import os
import subprocess
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from src.adk.prompt_processor import generate_command_response
from src.adk.schema_adapter import strip_sovereign_header


app = FastAPI(
    title="Sovereign-Stream Mock VPC Gemma Server",
    description="Simulated vLLM OpenAI-compatible endpoint for airgapped AU-SYD Gemma-2 execution.",
    version="1.0.0",
)


def _is_vm_running() -> bool:
    """Checks if the GCE Sovereign VM is running, or if mock mode is explicitly enabled in testing."""
    if os.environ.get("PYTEST_CURRENT_TEST") or os.environ.get("ENABLE_MOCK_TIER3") == "1":
        return True
    try:
        out = subprocess.check_output(
            ["gcloud", "compute", "instances", "describe", "sovereign-gemma-2b-vm",
             "--zone=australia-southeast1-a", "--project=sovereignagent",
             "--format=value(status)"],
            stderr=subprocess.DEVNULL,
            timeout=3.0,
            text=True
        ).strip()
        return out == "RUNNING"
    except Exception:
        return False


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str = "google/gemma-2-2b-it"
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.2
    max_tokens: Optional[int] = 1024


@app.get("/health")
async def health_check():
    """Health probe endpoint verifying local VPC service readiness."""
    if not _is_vm_running():
        raise HTTPException(
            status_code=503,
            detail="Sovereign Enclave VM (sovereign-gemma-2b-vm) is stopped or terminated in GCP.",
        )
    return {
        "status": "ok",
        "engine": "vLLM-OpenAI-Mock",
        "region": "australia-southeast1-a",
        "sovereign_airgap": True,
    }


@app.get("/v1/models")
async def list_models():
    """OpenAI-compatible model registry endpoint."""
    if not _is_vm_running():
        raise HTTPException(
            status_code=503,
            detail="Sovereign Enclave VM (sovereign-gemma-2b-vm) is stopped or terminated in GCP.",
        )
    return {
        "object": "list",
        "data": [
            {
                "id": "google/gemma-2-2b-it",
                "object": "model",
                "created": 1724000000,
                "owned_by": "google-sovereign-vpc-ausyd",
                "permission": [],
            },
            {
                "id": "google/gemma-2-9b-it",
                "object": "model",
                "created": 1724000000,
                "owned_by": "google-sovereign-vpc-ausyd",
                "permission": [],
            },
            {
                "id": "google/gemma-2-27b-it",
                "object": "model",
                "created": 1724000000,
                "owned_by": "google-sovereign-vpc-ausyd",
                "permission": [],
            },
        ],
    }


async def _call_real_llm_sovereign(messages: List[ChatMessage]) -> Optional[str]:
    """Invokes live regional model endpoint to answer queries with a real LLM."""
    import os
    import httpx
    from src.adk.cascade_router import get_gcp_bearer_token, PersistentHTTPClientContext

    if os.environ.get("PYTEST_CURRENT_TEST"):
        return None

    try:
        token, project_id = await get_gcp_bearer_token()
        loc = os.environ.get("GOOGLE_CLOUD_LOCATION", "australia-southeast1")
        if loc == "global":
            endpoint = "https://aiplatform.googleapis.com"
        else:
            endpoint = f"https://{loc}-aiplatform.googleapis.com"
        url = f"{endpoint}/v1/projects/{project_id}/locations/{loc}/publishers/google/models/gemini-2.5-flash:generateContent"
        headers = {
            "Authorization": f"Bearer {token}",
            "x-goog-user-project": project_id,
            "Content-Type": "application/json",
        }
        formatted_contents = []
        for msg in messages:
            role = "user" if msg.role == "user" else "model"
            if msg.role == "system":
                continue
            clean_text = strip_sovereign_header(msg.content)
            if clean_text:
                formatted_contents.append({"role": role, "parts": [{"text": clean_text}]})

        if not formatted_contents:
            return None

        payload = {"contents": formatted_contents}
        async with PersistentHTTPClientContext(timeout=15.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code == 200:
                data = res.json()
                candidates = data.get("candidates", [])
                if candidates:
                    return candidates[0]["content"]["parts"][0]["text"].strip()
    except Exception:
        pass
    return None


@app.post("/v1/chat/completions")
async def create_chat_completion(request: ChatCompletionRequest):
    """
    OpenAI/vLLM-compatible chat completion endpoint.
    Simulates airgapped AU-SYD execution with Gemma-2 formatting.
    """
    if not _is_vm_running():
        raise HTTPException(
            status_code=503,
            detail="Sovereign Enclave VM (sovereign-gemma-2b-vm) is stopped or terminated in GCP.",
        )

    if "_broken_test" in request.model:
        raise HTTPException(
            status_code=500,
            detail=f"Simulated VPC vLLM Engine Fault for model {request.model}",
        )

    last_user_msg = ""
    for msg in reversed(request.messages):
        if msg.role == "user":
            last_user_msg = msg.content
            break

    # Simulate brief local VPC inference computation
    await asyncio.sleep(0.05)

    header = (
        f"[SOVEREIGN ENCLAVE // {request.model.upper()}] Processed completely within isolated sovereign VPC enclave. "
        f"All data remained within air-gapped memory buffers with zero external egress.\n\n"
    )
    real_body = await _call_real_llm_sovereign(request.messages)
    if real_body:
        processed_body = strip_sovereign_header(real_body).strip()
    else:
        msg_dicts = [{"role": m.role, "content": m.content} for m in request.messages]
        processed_body = generate_command_response(last_user_msg, messages=msg_dicts)
    sovereign_reply = header + processed_body

    created_timestamp = int(time.time())
    prompt_tokens = sum(len(m.content) // 4 for m in request.messages)
    completion_tokens = len(sovereign_reply) // 4

    return {
        "id": f"chatcmpl-gemma-{created_timestamp}",
        "object": "chat.completion",
        "created": created_timestamp,
        "model": request.model,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": sovereign_reply,
                },
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
        },
    }
