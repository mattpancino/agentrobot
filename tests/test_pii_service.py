# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Resilient Multi-Tier AI Failover Demo
"""
Unit tests for Sprint 3: Cloud Run Microservice & Enclave Container endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from src.services.pii_tokenizer.main import app
from src.adk.pii_tokenizer import SovereignPIITokenizer


@pytest.fixture
def client():
    return TestClient(app)


def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["service"] == "sovereign-pii-tokenizer"
    assert "engine" in data


def test_tokenize_endpoint(client):
    payload = {
        "text": "Transfer $500 to John Smith at john.smith@enterprise.com.",
        "sessionId": "service-test-1",
        "vault": {},
    }
    res = client.post("/v1/tokenize", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "tokenizedText" in data
    assert "[[PII_PERSON_" in data["tokenizedText"]
    assert "[[PII_EMAIL_ADDRESS_" in data["tokenizedText"]
    assert "vault" in data
    assert len(data["vault"]) >= 2
    assert "telemetry" in data
    assert data["telemetry"]["entitiesIntercepted"] >= 2


def test_detokenize_endpoint(client):
    vault = {
        "PII_PERSON_1_7A": {"raw": "John Smith", "type": "PERSON", "confidence": 0.95},
        "PII_ACC_1_7A": {"raw": "123-456", "type": "AU_BSB_ACCOUNT", "confidence": 0.90},
    }
    payload = {
        "text": "Transferred $500 to [[PII_PERSON_1_7A]] (account: [[PII_ACC_1_7A]]).",
        "vault": vault,
    }
    res = client.post("/v1/detokenize", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["detokenizedText"] == "Transferred $500 to John Smith (account: 123-456)."


@pytest.mark.asyncio
async def test_client_fallback_when_service_unreachable():
    tokenizer = SovereignPIITokenizer(
        service_url="http://127.0.0.1:9999",  # Non-existent port
        use_remote_service=True,
    )
    # tokenize_async will catch connection error and fall back to local in-process tokenizer
    tok, vault, tel = await tokenizer.tokenize_async(
        "Transfer $100 to John Smith.", session_id="fallback-test"
    )
    assert "[[PII_PERSON_" in tok
    assert len(vault) >= 1
