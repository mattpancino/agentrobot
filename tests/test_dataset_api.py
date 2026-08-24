# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Integration Tests for Dataset API Endpoints

import pytest
from fastapi.testclient import TestClient
from src.backend.main import app, GLOBAL_SETTINGS
from src.adk.loan_lvr_tool import reset_default_loans


@pytest.fixture
def client():
    reset_default_loans()
    return TestClient(app)


def test_get_dataset_api(client):
    response = client.get("/api/dataset")
    assert response.status_code == 200
    data = response.json()
    assert "rowCount" in data
    assert data["rowCount"] >= 5
    assert "stats" in data
    assert "totalLoanBookAud" in data["stats"]
    assert "storageResidency" in data
    assert data["storageResidency"]["jurisdiction"] == "australia-southeast1"


def test_toggle_dataset_api(client):
    # Toggle OFF
    res_off = client.post("/api/dataset/toggle", json={"enabled": False})
    assert res_off.status_code == 200
    assert res_off.json()["enabled"] is False
    assert GLOBAL_SETTINGS["enterpriseDataEnabled"] is False

    # Check /api/dataset reflects toggle
    get_res = client.get("/api/dataset")
    assert get_res.json()["enabled"] is False

    # Toggle ON
    res_on = client.post("/api/dataset/toggle", json={"enabled": True})
    assert res_on.status_code == 200
    assert res_on.json()["enabled"] is True


def test_ingest_and_reset_dataset_api(client):
    custom_csv = """customer_id,customer_name,property_value_aud,loan_balance_aud,annual_income_aud,monthly_expenses_aud,current_interest_rate_pct,loan_term_years
CUST-DEMO1,Alice Smith,900000.00,450000.00,180000.00,3500.00,6.00,30
"""
    res = client.post("/api/dataset/ingest", json={"csvContent": custom_csv})
    assert res.status_code == 200
    data = res.json()
    assert data["rowCount"] == 1
    assert data["rows"][0]["customerId"] == "CUST-DEMO1"
    assert data["rows"][0]["lvrPercent"] == 50.0

    # Reset
    reset_res = client.post("/api/dataset/reset")
    assert reset_res.status_code == 200
    reset_data = reset_res.json()
    assert reset_data["rowCount"] >= 5


def test_invalid_csv_ingest_fails_cleanly(client):
    res = client.post("/api/dataset/ingest", json={"csvContent": "bad,header\n1,2"})
    assert res.status_code == 400
    assert "Missing required CSV columns" in res.json()["detail"]
