# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Test Suite for Dual-Mode Sovereign Skill Architecture

import pytest
from fastapi.testclient import TestClient
from src.backend.main import app
from src.adk.skill_registry import (
    cloud_skill_registry,
    enclave_skill_manager,
    CloudSkillRegistry,
    EnclaveSkillManager,
)

client = TestClient(app)


def test_cloud_skill_registry_metadata():
    """Verify that CloudSkillRegistry correctly retrieves APRA skill metadata with CMEK key."""
    registry = CloudSkillRegistry()
    skill = registry.get_skill("apra-underwriting")
    assert "underwriting" in skill.skillName
    assert skill.version == "1.2.0"
    assert skill.jurisdiction == "australia-southeast1"
    assert "projects/sovereignagent/locations/australia-southeast1" in skill.cmekKey
    assert "TIER_1_GLOBAL" in skill.tierSuitability
    assert "TIER_2_REGIONAL" in skill.tierSuitability
    assert "calculate_customer_lvr_and_serviceability" in skill.content
    assert skill.lineCount > 20

    status = registry.get_registry_status()
    assert status["status"] == "ONLINE"
    assert status["registryType"] == "MANAGED_CLOUD_REGISTRY"
    assert status["cmekEncryption"]["status"] == "ENABLED"


@pytest.mark.asyncio
async def test_enclave_skill_manager_sync_and_status():
    """Verify that EnclaveSkillManager reports baked disk status and can sync skills."""
    manager = EnclaveSkillManager()
    status = await manager.get_enclave_status()
    assert status["status"] == "BAKED_ON_DISK"
    assert status["cordCutReady"] is True
    assert "/var/sovereign/skills/apra_underwriting/SKILL.md" in status["bakedFilePath"]

    sync_res = await manager.sync_skill_to_enclave("test skill content")
    assert sync_res["status"] == "SUCCESS"
    assert sync_res["cordCutReady"] is True


def test_api_skills_provenance_endpoint():
    """Verify that /api/skills/provenance returns dual-mode Cloud Registry & Baked Enclave telemetry."""
    res = client.get("/api/skills/provenance")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"

    cloud = data["cloudRegistry"]
    assert cloud["registryType"] == "MANAGED_CLOUD_REGISTRY"
    assert cloud["jurisdiction"] == "australia-southeast1"
    assert cloud["cmekEncryption"]["status"] == "ENABLED"
    assert "TIER_1_GLOBAL" in cloud["tierSuitability"]

    enclave = data["enclaveBaked"]
    assert enclave["storageType"] == "BAKED_ENCLAVE_DISK"
    assert enclave["cordCutReady"] is True
    assert "TIER_3_SOVEREIGN" in enclave["tierSuitability"]
    assert "/var/sovereign/skills" in enclave["bakedFilePath"]


def test_api_sync_skill_to_enclave_endpoint():
    """Verify that /api/skills/sync-enclave triggers sync to Enclave VM."""
    res = client.post("/api/skills/sync-enclave")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["cordCutReady"] is True


def test_chat_telemetry_includes_skill_provenance():
    """Verify that chat responses carry skillProvenance telemetry reflecting active tier."""
    # Test Tier 1 / 2 skill provenance
    res_t1 = client.post(
        "/api/chat",
        json={
            "sessionId": "skill-provenance-t1-test",
            "message": "Calculate LVR for Sarah Jenkins",
            "simulationControls": {
                "forcedTier": "TIER_1_GLOBAL",
                "enterpriseDataEnabled": True,
            },
        },
    )
    assert res_t1.status_code == 200
    data_t1 = res_t1.json()
    meta_t1 = data_t1["executionMetadata"]
    assert "skillProvenance" in meta_t1
    assert meta_t1["skillProvenance"]["source"] == "MANAGED_CLOUD_REGISTRY"
    assert "Cloud Registry" in meta_t1["skillProvenance"]["provenanceLabel"]

    # Test Tier 3 Baked Enclave skill provenance
    res_t3 = client.post(
        "/api/chat",
        json={
            "sessionId": "skill-provenance-t3-test",
            "message": "Calculate LVR for Sarah Jenkins",
            "simulationControls": {
                "forcedTier": "TIER_3_SOVEREIGN",
                "enterpriseDataEnabled": True,
            },
        },
    )
    assert res_t3.status_code == 200
    data_t3 = res_t3.json()
    meta_t3 = data_t3["executionMetadata"]
    assert "skillProvenance" in meta_t3
    assert meta_t3["skillProvenance"]["source"] == "BAKED_ENCLAVE_DISK"
    assert "Baked Enclave Disk" in meta_t3["skillProvenance"]["provenanceLabel"]
    assert meta_t3["skillProvenance"]["cordCutReady"] is True
