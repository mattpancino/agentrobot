# Copyright 2026 Google LLC. All Rights Reserved.
"""
Tests for FastAPI Gateway /api/chat, /api/models, and /api/settings endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from src.backend.main import app

client = TestClient(app)


def test_api_chat_normal_turn():
    response = client.post(
        "/api/chat",
        json={
            "sessionId": "gateway-test-1",
            "message": "What is APRA CPS 234?",
            "simulationControls": {"injectMockFailure": False, "forcedTier": "AUTO"},
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "content" in data
    assert "executionMetadata" in data
    meta = data["executionMetadata"]
    assert meta["activeTier"] == "TIER_1_GLOBAL"
    assert meta["modelUsed"] == "gemini-3.7-flash"
    assert meta["recoverySentinel"]["status"] == "IDLE_HEALTHY"


def test_api_chat_mock_failure_injection():
    response = client.post(
        "/api/chat",
        json={
            "sessionId": "gateway-test-2",
            "message": "Give me an incident response checklist",
            "simulationControls": {"injectMockFailure": True, "forcedTier": "AUTO"},
        },
    )
    assert response.status_code == 200
    data = response.json()
    meta = data["executionMetadata"]
    assert meta["activeTier"] == "TIER_2_REGIONAL"
    assert meta["modelUsed"] == "gemini-2.5-flash"
    assert meta["failoverOccurred"] is True
    assert meta["stickyTier"] == "TIER_2_REGIONAL"
    assert meta["recoverySentinel"]["status"] == "PROBING_BACKGROUND"


def test_api_get_models_catalog():
    """Verify that the app lists available models in each region."""
    response = client.get("/api/models")
    assert response.status_code == 200
    data = response.json()

    assert "catalog" in data
    assert isinstance(data["catalog"], list)
    assert len(data["catalog"]) >= 4

    region_ids = [reg["regionId"] for reg in data["catalog"]]
    assert "global" in region_ids
    assert "australia-southeast1" in region_ids
    assert "airgap-vpc-sovereign" in region_ids

    # Check models list within a region
    syd_region = next(r for r in data["catalog"] if r["regionId"] == "australia-southeast1")
    assert "models" in syd_region
    model_ids = [m["id"] for m in syd_region["models"]]
    assert "gemini-1.5-flash-002" in model_ids


def test_api_update_and_get_settings():
    """Verify that the user can select and save models for each region/tier in settings."""
    custom_settings = {
        "TIER_1_GLOBAL": {"region": "global", "model": "gemini-2.0-flash-001"},
        "TIER_2_REGIONAL": {"region": "australia-southeast2", "model": "gemini-1.5-pro-002"},
        "TIER_3_SOVEREIGN": {"region": "airgap-vpc-ausyd", "model": "google/gemma-2-27b-it"},
    }

    post_res = client.post("/api/settings", json={"tierSettings": custom_settings})
    assert post_res.status_code == 200
    assert post_res.json()["status"] == "success"
    assert post_res.json()["tierSettings"] == custom_settings

    get_res = client.get("/api/settings")
    assert get_res.status_code == 200
    assert get_res.json()["tierSettings"] == custom_settings

    # Reset settings back to default for clean state in subsequent tests
    default_settings = {
        "TIER_1_GLOBAL": {"region": "global", "model": "gemini-1.5-pro-002"},
        "TIER_2_REGIONAL": {"region": "australia-southeast1", "model": "gemini-1.5-flash-002"},
        "TIER_3_SOVEREIGN": {"region": "airgap-vpc-ausyd", "model": "google/gemma-2-2b-it"},
    }
    client.post("/api/settings", json={"tierSettings": default_settings})


def test_api_chat_processes_general_command():
    """Verify that general commands are actually processed and answered rather than returning boilerplate."""
    response = client.post(
        "/api/chat",
        json={
            "sessionId": "gateway-test-dogs",
            "message": "give me three common types of dogs",
            "simulationControls": {"injectMockFailure": False, "forcedTier": "AUTO"},
        },
    )
    assert response.status_code == 200
    data = response.json()
    content = data["content"]
    assert "Labrador Retriever" in content
    assert "German Shepherd" in content
    assert "Golden Retriever" in content


def test_api_chat_with_custom_model_selection():
    """Verify that user-selected models are used during turn execution."""
    custom_tier_settings = {
        "TIER_1_GLOBAL": {"region": "global", "model": "gemini-2.0-flash-001"},
    }
    response = client.post(
        "/api/chat",
        json={
            "sessionId": "gateway-test-custom-model",
            "message": "give me three common types of dogs",
            "simulationControls": {
                "injectMockFailure": False,
                "forcedTier": "TIER_1_GLOBAL",
                "tierSettings": custom_tier_settings,
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    meta = data["executionMetadata"]
    assert meta["modelUsed"] == "gemini-2.0-flash-001"
    assert meta["activeTier"] == "TIER_1_GLOBAL"
    assert "Common Types of Dogs" in data["content"]
    assert "Labrador Retriever" in data["content"]


def test_clean_conversational_greeting_hello():
    """Verify that 'hello' returns a natural greeting without injected markdown headers."""
    response = client.post(
        "/api/chat",
        json={
            "sessionId": "greeting-test",
            "message": "hello",
            "simulationControls": {"injectMockFailure": False, "forcedTier": "AUTO"},
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "Hello! How can I help you today?" in data["content"]
    assert "GLOBAL FRONTIER TIER" not in data["content"]
    assert data["executionMetadata"]["activeTier"] == "TIER_1_GLOBAL"


def test_dynamic_dog_count_extraction_5():
    """Verify that asking for '5 types of dogs' dynamically returns exactly 5 dog breeds."""
    response = client.post(
        "/api/chat",
        json={
            "sessionId": "dogs-5-test",
            "message": "what are 5 types of dogs",
            "simulationControls": {"injectMockFailure": False, "forcedTier": "AUTO"},
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "### 5 Common Types of Dogs" in data["content"]
    assert "5. **Beagle**" in data["content"]
    assert "6. **Poodle**" not in data["content"]


def test_dynamic_cat_count_extraction_5_gemma():
    """Verify that asking a random question to Gemma/Sovereign tier returns a clean response without boilerplate."""
    response = client.post(
        "/api/chat",
        json={
            "sessionId": "cats-5-gemma-test",
            "message": "name 5 types of cats",
            "simulationControls": {"injectMockFailure": False, "forcedTier": "TIER_3_SOVEREIGN"},
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["executionMetadata"]["activeTier"] == "TIER_3_SOVEREIGN"
    assert "gemma" in data["executionMetadata"]["modelUsed"].lower()
    assert "SOVEREIGN ENCLAVE" in data["content"]
    assert "Key Category / Option" not in data["content"]


def test_enclave_management_endpoints():
    """Verify that the /api/enclave status and control endpoints return valid responses."""
    status_res = client.get("/api/enclave/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["vmStatus"] == "RUNNING"
    assert status_data["tunnelActive"] is True
    assert status_data["modelLoaded"] == "google/gemma-2-2b-it"

    start_vm_res = client.post("/api/enclave/start-vm")
    assert start_vm_res.status_code == 200
    assert "VM startup" in start_vm_res.json()["message"]

    start_tunnel_res = client.post("/api/enclave/start-tunnel")
    assert start_tunnel_res.status_code == 200
    assert "IAP tunnel" in start_tunnel_res.json()["message"]

    stop_vm_res = client.post("/api/enclave/stop-vm")
    assert stop_vm_res.status_code == 200
    assert "VM stop" in stop_vm_res.json()["message"]

    logs_res = client.get("/api/enclave/logs")
    assert logs_res.status_code == 200
    logs_data = logs_res.json()
    assert logs_data["status"] == "SUCCESS"
    assert logs_data["vmName"] == "sovereign-gemma-2b-vm"
    assert len(logs_data["logs"]) > 0
    assert "POST" in logs_data["logs"][2] or "tokens" in logs_data["logs"][0]


def test_api_chat_failed_tiers_injection():
    response = client.post(
        "/api/chat",
        json={
            "sessionId": "gateway-test-failed-tiers",
            "message": "Give me an incident response checklist",
            "simulationControls": {"failedTiers": ["TIER_1_GLOBAL"], "forcedTier": "AUTO"},
        },
    )
    assert response.status_code == 200
    data = response.json()
    meta = data["executionMetadata"]
    assert meta["activeTier"] == "TIER_2_REGIONAL"
    assert meta["failoverOccurred"] is True
    assert meta["stickyTier"] == "TIER_2_REGIONAL"
    assert meta["recoverySentinel"]["status"] == "FORCE_FAILED"
    assert meta["recoverySentinel"]["failedTiers"] == ["TIER_1_GLOBAL"]
    assert "force-failed by controls" in meta["recoverySentinel"]["message"]


def test_api_build_info():
    """Verify that build time and git branch are returned by build info and models endpoints."""
    res_build = client.get("/api/build-info")
    assert res_build.status_code == 200
    data_build = res_build.json()
    assert "buildTime" in data_build
    assert "branch" in data_build
    assert data_build["buildTime"]
    assert data_build["branch"]

    res_models = client.get("/api/models")
    assert res_models.status_code == 200
    data_models = res_models.json()
    assert "buildInfo" in data_models
    assert data_models["buildInfo"]["branch"] == data_build["branch"]


def test_enclave_status_when_vm_stopped(monkeypatch):
    """Verify that when the VM is stopped/terminated in GCP, tunnelActive is False and modelLoaded is None."""
    from src.backend import main
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    monkeypatch.setattr(main.subprocess, "check_output", lambda *args, **kwargs: "TERMINATED\n")

    res = client.get("/api/enclave/status")
    assert res.status_code == 200
    data = res.json()
    assert data["vmStatus"] == "TERMINATED"
    assert data["tunnelActive"] is False
    assert data["modelLoaded"] == "None"


def test_api_architecture_descriptions():
    """Verify that architecture descriptions can be updated and retrieved via /api/settings and /api/models."""
    custom_desc = {
        "runtime": "Custom sandboxed execution environment.",
        "model": "Custom model routing description.",
    }
    # Update settings
    post_res = client.post("/api/settings", json={"architectureDescriptions": custom_desc})
    assert post_res.status_code == 200
    post_data = post_res.json()
    assert "architectureDescriptions" in post_data
    assert post_data["architectureDescriptions"]["runtime"] == "Custom sandboxed execution environment."

    # Get settings
    get_res = client.get("/api/settings")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["architectureDescriptions"]["runtime"] == "Custom sandboxed execution environment."

    # Get models
    models_res = client.get("/api/models")
    assert models_res.status_code == 200
    models_data = models_res.json()
    assert "architectureDescriptions" in models_data
    assert models_data["architectureDescriptions"]["runtime"] == "Custom sandboxed execution environment."


def test_api_demo_reset():
    """Verify that /api/demo/reset clears all session stores, resets stages to Stage 1, and verifies Tier 3."""
    # First, populate a session with messages
    client.post(
        "/api/chat",
        json={
            "sessionId": "demo-reset-test-session",
            "message": "Remember this secret session data",
            "simulationControls": {"forcedTier": "AUTO", "enterpriseDataEnabled": True},
        },
    )

    # Perform demo reset
    res = client.post("/api/demo/reset")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["stage"] == 1
    assert data["memoryCleared"] is True
    assert data["enterpriseDataEnabled"] is False
    assert "tier3" in data
    assert data["tier3"]["gemmaAccessible"] is True
    assert "datasetSummary" in data

    # Verify session was purged
    session_res = client.get("/api/session/demo-reset-test-session")
    assert session_res.status_code == 200
    session_data = session_res.json()
    assert session_data.get("messages") == []

def test_api_get_skill_spec():
    """Verify that /api/skills/apra-underwriting returns authentic raw SKILL.md specification with YAML frontmatter."""
    res = client.get("/api/skills/apra-underwriting")
    assert res.status_code == 200
    data = res.json()
    assert "underwriting" in data["skillName"]
    assert "skills/apra_underwriting/SKILL.md" in data["path"]
    assert "name: apra-cps234-underwriting" in data["content"]
    assert "APRA CPS 234 & APS 220 Sovereign Credit Underwriting Skill" in data["content"]
    assert "calculate_customer_lvr_and_serviceability" in data["content"]
