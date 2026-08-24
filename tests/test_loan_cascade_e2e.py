# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Enterprise Loan Book & LVR Cascade E2E Tests
"""
End-to-end integration tests verifying that Enterprise Loan Book and LVR calculations
execute deterministically across all three sovereignty tiers:
- Tier 1: Global Frontier Model (Gemini 3.7 Flash)
- Tier 2: Jurisdictional Regional Model (Gemini 2.5 Flash AU-SYD)
- Tier 3: Sovereign Airgapped VPC Enclave (Gemma 2 9B Local)
"""

import pytest
from fastapi.testclient import TestClient
from src.backend.main import app
from src.adk.loan_lvr_tool import reset_default_loans

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_default_dataset():
    """Ensure clean benchmark loan dataset before each test."""
    reset_default_loans()
    client.post("/api/dataset/toggle", json={"enabled": True})
    yield
    reset_default_loans()
    client.post("/api/dataset/toggle", json={"enabled": True})


def test_loan_e2e_tier_1_sarah_jenkins_lvr():
    """Verify Tier 1 Global Agent executes tool for Sarah Jenkins (CUST-8821)."""
    response = client.post(
        "/api/chat",
        json={
            "sessionId": "e2e-loan-tier1-sess",
            "message": "Calculate LVR and LMI requirements for customer Sarah Jenkins (CUST-8821)",
            "simulationControls": {
                "forcedTier": "TIER_1_GLOBAL",
                "enablePiiTokenizer": True,
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    meta = data["executionMetadata"]

    assert meta["activeTier"] == "TIER_1_GLOBAL"
    assert "content" in data
    content = data["content"]

    # Verify key deterministic calculations in response
    assert "Sarah Jenkins" in content or "CUST-8821" in content
    assert "81.67%" in content
    assert "MANDATORY" in content or "LMI" in content
    assert "5,970.44" in content

    # Verify Zero-PII Egress Protection
    assert meta.get("tokenizedPrompt") is not None
    assert "[[PII_PERSON_" in meta["tokenizedPrompt"]
    assert "Sarah Jenkins" not in meta["tokenizedPrompt"]

    assert meta.get("tokenizedResponse") is not None
    assert "[[PII_PERSON_" in meta["tokenizedResponse"]
    assert "Sarah Jenkins" not in meta["tokenizedResponse"]

    assert data.get("tokenizedContent") is not None
    assert "Sarah Jenkins" not in data["tokenizedContent"]


def test_loan_e2e_tier_2_david_zhang_apra_stress():
    """Verify Tier 2 Regional Agent (AU-SYD) executes tool for David Zhang (CUST-1042)."""
    response = client.post(
        "/api/chat",
        json={
            "sessionId": "e2e-loan-tier2-sess",
            "message": "Run APRA +3.0% mortgage serviceability stress test on David Zhang CUST-1042",
            "simulationControls": {
                "forcedTier": "TIER_2_REGIONAL",
                "enablePiiTokenizer": True,
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    meta = data["executionMetadata"]

    assert meta["activeTier"] == "TIER_2_REGIONAL"
    content = data["content"]

    assert "David Zhang" in content or "CUST-1042" in content
    assert "60.00%" in content
    assert "3,282.82" in content
    assert "4,290.26" in content
    assert "PASSED" in content or "PASS" in content

    # Verify Zero-PII Egress Protection
    assert meta.get("tokenizedPrompt") is not None
    assert "[[PII_PERSON_" in meta["tokenizedPrompt"]
    assert "David Zhang" not in meta["tokenizedPrompt"]

    assert meta.get("tokenizedResponse") is not None
    assert "[[PII_PERSON_" in meta["tokenizedResponse"]
    assert "David Zhang" not in meta["tokenizedResponse"]


def test_loan_e2e_tier_3_emma_watson_sovereign_enclave():
    """Verify Tier 3 On-Prem Agent executes tool for Emma Watson (CUST-3310)."""
    response = client.post(
        "/api/chat",
        json={
            "sessionId": "e2e-loan-tier3-sess",
            "message": "Audit customer Emma Watson CUST-3310 for high LVR default risk and buffer breach",
            "simulationControls": {
                "forcedTier": "TIER_3_SOVEREIGN",
                "enablePiiTokenizer": True,
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    meta = data["executionMetadata"]

    assert meta["activeTier"] == "TIER_3_SOVEREIGN"
    content = data["content"]

    assert "Emma Watson" in content or "CUST-3310" in content
    assert "90.77%" in content
    assert "3,632.73" in content
    assert "MANDATORY" in content or "LMI" in content

    # Verify Zero-PII Egress Protection
    assert meta.get("tokenizedPrompt") is not None
    assert "[[PII_PERSON_" in meta["tokenizedPrompt"]
    assert "Emma Watson" not in meta["tokenizedPrompt"]

    assert meta.get("tokenizedResponse") is not None
    assert "[[PII_PERSON_" in meta["tokenizedResponse"]
    assert "Emma Watson" not in meta["tokenizedResponse"]


def test_loan_e2e_failover_cascade_with_tool():
    """Verify that during a Tier 1 + Tier 2 outage, loan queries fail over smoothly to Tier 3."""
    response = client.post(
        "/api/chat",
        json={
            "sessionId": "e2e-loan-failover-sess",
            "message": "Calculate mortgage serviceability for Marcus Aurelius (CUST-4491)",
            "simulationControls": {
                "forcedTier": "AUTO",
                "failedTiers": ["TIER_1_GLOBAL", "TIER_2_REGIONAL"],
                "enablePiiTokenizer": True,
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    meta = data["executionMetadata"]

    assert meta["activeTier"] == "TIER_3_SOVEREIGN"
    assert meta["failoverOccurred"] is True
    assert meta["failoverHops"] == 2
    content = data["content"]

    assert "Marcus Aurelius" in content or "CUST-4491" in content
    assert "59.52%" in content
    assert "7,374.26" in content


def test_loan_e2e_custom_csv_ingestion_and_query():
    """Verify ingesting a brand new custom loan record into local VM storage and querying it immediately."""
    custom_csv = (
        "customer_id,customer_name,property_value_aud,loan_balance_aud,annual_income_aud,monthly_expenses_aud,current_interest_rate_pct,loan_term_years\n"
        "CUST-7777,Kylie Minogue,3500000.00,2450000.00,650000.00,9500.00,5.80,30\n"
    )
    ingest_res = client.post(
        "/api/dataset/ingest",
        json={"csvContent": custom_csv},
    )
    assert ingest_res.status_code == 200
    assert ingest_res.json()["rowCount"] == 1

    # Query new customer
    query_res = client.post(
        "/api/chat",
        json={
            "sessionId": "e2e-loan-custom-ingest-sess",
            "message": "What is the LVR and APRA buffer for Kylie Minogue CUST-7777?",
            "simulationControls": {"forcedTier": "AUTO"},
        },
    )
    assert query_res.status_code == 200
    content = query_res.json()["content"]

    assert "Kylie Minogue" in content or "CUST-7777" in content
    assert "70.00%" in content
    assert "14,375.45" in content


def test_loan_e2e_pii_shield_and_tool_interoperability():
    """Verify that sensitive PII in the user prompt is tokenized before egress while tool parameters are extracted."""
    response = client.post(
        "/api/chat",
        json={
            "sessionId": "e2e-loan-pii-sess",
            "message": "Customer Sarah Jenkins with TFN 123 456 782 and account 123-456 requested LVR audit for CUST-8821.",
            "simulationControls": {
                "forcedTier": "TIER_1_GLOBAL",
                "enablePiiTokenizer": True,
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    meta = data["executionMetadata"]

    # Verify PII was intercepted
    assert meta["piiTelemetry"]["enabled"] is True
    assert meta["piiTelemetry"]["entitiesIntercepted"] >= 1
    assert "[[PII_AU_TFN_" in meta["tokenizedPrompt"] or "[[PII_AU_BANK_ACCOUNT_" in meta["tokenizedPrompt"]

    # Verify tool still executed and answered
    content = data["content"]
    assert "Sarah Jenkins" in content or "CUST-8821" in content
    assert "81.67%" in content


def test_loan_e2e_paydown_scenario():
    """Verify follow-up paydown hypothetical calculation without CUST- ID in prompt."""
    response = client.post(
        "/api/chat",
        json={
            "sessionId": "e2e-paydown-sess",
            "message": "If Sarah Jenkins pays down $50,000 off her loan balance, what is her new LVR and does she still need LMI?",
            "simulationControls": {
                "forcedTier": "TIER_1_GLOBAL",
                "enablePiiTokenizer": True,
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    content = data["content"]
    assert "77.50%" in content
    assert "NO LONGER REQUIRED" in content or "not required" in content.lower() or "80" in content


def test_loan_e2e_comparative_tier_switch():
    """
    Verify multi-turn flow:
    Turn 1 (Tier 1): Query Emma Watson LVR.
    Turn 2 (Tier 3): Switch to Tier 3 Airgap and query 'Compare Emma Watson's LVR risk tier against Sarah Jenkins'.
    Verify both entities are queried, tool executes for both, and comparative table is synthesized.
    """
    session_id = "e2e-comparative-switch-sess"

    # Turn 1: Emma Watson on Tier 1
    t1_res = client.post(
        "/api/chat",
        json={
            "sessionId": session_id,
            "message": "Calculate LVR for Emma Watson",
            "simulationControls": {
                "forcedTier": "TIER_1_GLOBAL",
                "enablePiiTokenizer": True,
            },
        },
    )
    assert t1_res.status_code == 200
    t1_data = t1_res.json()
    assert "90.77%" in t1_data["content"]

    # Turn 2: Compare Emma Watson against Sarah Jenkins on Tier 3
    t2_res = client.post(
        "/api/chat",
        json={
            "sessionId": session_id,
            "message": "Compare Emma Watson's LVR risk tier against Sarah Jenkins",
            "simulationControls": {
                "forcedTier": "TIER_3_SOVEREIGN",
                "enablePiiTokenizer": True,
            },
        },
    )
    assert t2_res.status_code == 200
    t2_data = t2_res.json()
    t2_meta = t2_data["executionMetadata"]
    assert t2_meta["activeTier"] == "TIER_3_SOVEREIGN"

    t2_content = t2_data["content"]
    # Verify BOTH customers are present in comparative report
    assert "Emma Watson" in t2_content or "CUST-3310" in t2_content
    assert "Sarah Jenkins" in t2_content or "CUST-8821" in t2_content
    assert "90.77%" in t2_content
    assert "81.67%" in t2_content
    assert "Comparative" in t2_content or "Assessment" in t2_content

    # Verify toolCalls dispatched both customers
    tool_calls = t2_meta.get("toolCalls", [])
    assert len(tool_calls) == 2
    cids_queried = [tc.get("arguments", {}).get("customer_id") for tc in tool_calls]
    assert "CUST-3310" in cids_queried or "Emma Watson" in cids_queried
    assert "CUST-8821" in cids_queried or "Sarah Jenkins" in cids_queried


