# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Test Suite for Model Token Usage & Unit Economics (Cost / x10,000 Turns)

import pytest
from fastapi.testclient import TestClient
from src.backend.main import app
from src.adk.model_registry import (
    get_model_pricing,
    calculate_10k_turn_cost,
    calculate_1k_turn_cost,
    REGIONAL_MODEL_CATALOG,
)

client = TestClient(app)


def test_model_catalog_has_pricing_metadata():
    """Verify that every model in every region includes pricing metadata with USD currency."""
    for region in REGIONAL_MODEL_CATALOG:
        for model in region.get("models", []):
            assert "pricing" in model, f"Model {model['id']} in {region['regionId']} missing pricing"
            pricing = model["pricing"]
            assert "inputPricePerMillion" in pricing
            assert "outputPricePerMillion" in pricing
            assert pricing["currency"] == "USD"
            assert pricing["inputPricePerMillion"] >= 0.0
            assert pricing["outputPricePerMillion"] >= 0.0


def test_get_model_pricing_rates():
    """Verify get_model_pricing returns accurate Vertex AI and self-hosted rates."""
    # Flash
    flash_pricing = get_model_pricing("gemini-3.7-flash")
    assert flash_pricing["inputPricePerMillion"] == 0.10
    assert flash_pricing["outputPricePerMillion"] == 0.40

    # Pro
    pro_pricing = get_model_pricing("gemini-1.5-pro-002")
    assert pro_pricing["inputPricePerMillion"] == 1.25
    assert pro_pricing["outputPricePerMillion"] == 5.00

    # Gemma 2 (Self-Hosted Airgapped)
    gemma_pricing = get_model_pricing("google/gemma-2-2b-it")
    assert gemma_pricing["inputPricePerMillion"] == 0.0
    assert gemma_pricing["outputPricePerMillion"] == 0.0


def test_calculate_10k_turn_cost_accuracy():
    """Verify mathematical precision of the 10,000-turn cost formula."""
    # 1. Flash: 1,200 in / 300 out -> (1200 * 0.10/1M + 300 * 0.40/1M) * 10000 = $2.40
    flash_cost_10k = calculate_10k_turn_cost("gemini-3.7-flash", input_tokens=1200, output_tokens=300)
    assert flash_cost_10k == 2.40

    flash_cost_1k = calculate_1k_turn_cost("gemini-3.7-flash", input_tokens=1200, output_tokens=300)
    assert flash_cost_1k == 0.24

    # 2. Pro: 1,200 in / 300 out -> (1200 * 1.25/1M + 300 * 5.00/1M) * 10000 = $30.00
    pro_cost_10k = calculate_10k_turn_cost("gemini-1.5-pro-002", input_tokens=1200, output_tokens=300)
    assert pro_cost_10k == 30.00

    pro_cost_1k = calculate_1k_turn_cost("gemini-1.5-pro-002", input_tokens=1200, output_tokens=300)
    assert pro_cost_1k == 3.00

    # 3. Gemma 2 (Airgapped): 0 API fee
    gemma_cost_10k = calculate_10k_turn_cost("google/gemma-2-2b-it", input_tokens=1200, output_tokens=300)
    assert gemma_cost_10k == 0.0


def test_models_endpoint_returns_pricing():
    """Verify that GET /api/models includes model pricing details in catalog."""
    response = client.get("/api/models")
    assert response.status_code == 200
    data = response.json()
    catalog = data.get("catalog", [])
    assert isinstance(catalog, list)
    assert len(catalog) >= 3

    # Check Tier 1 Global
    global_reg = next(r for r in catalog if r["regionId"] == "global")
    flash_mod = next(m for m in global_reg["models"] if m["id"] == "gemini-3.7-flash")
    assert flash_mod["pricing"]["inputPricePerMillion"] == 0.10
    assert flash_mod["pricing"]["outputPricePerMillion"] == 0.40


def test_chat_response_includes_token_and_cost_metadata():
    """Verify that POST /api/chat returns inputTokens, outputTokens, totalTokens, costPer10kTurnsUsd in executionMetadata."""
    payload = {
        "sessionId": "test-pricing-session",
        "message": "Hello, explain mortgage interest rates.",
        "simulationControls": {"forcedTier": "TIER_1_GLOBAL"},
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    metadata = data.get("executionMetadata", {})

    assert "inputTokens" in metadata
    assert "outputTokens" in metadata
    assert "totalTokens" in metadata
    assert "costPer10kTurnsUsd" in metadata

    assert metadata["inputTokens"] > 0
    assert metadata["outputTokens"] > 0
    assert metadata["totalTokens"] == metadata["inputTokens"] + metadata["outputTokens"]
    assert metadata["costPer10kTurnsUsd"] >= 0.0
