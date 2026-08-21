# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Unit Tests for Loan LVR Mathematical Tool

import os
import pytest
from src.adk.loan_lvr_tool import (
    calculate_customer_lvr_and_serviceability,
    calculate_monthly_repayment,
    get_all_loan_customers,
    get_dataset_summary,
    ingest_loans_csv,
    reset_default_loans,
    DEFAULT_LOANS_CSV_PATH,
)
from src.adk.tool_registry import extract_tool_schema, execute_tool_call


def test_monthly_repayment_math():
    # $1,000,000 at 6.0% over 30 years -> ~ $5,995.51/month
    m = calculate_monthly_repayment(1000000.0, 6.0, 30)
    assert 5990.0 < m < 6000.0

    # 0 interest rate -> simple division
    m0 = calculate_monthly_repayment(360000.0, 0.0, 30)
    assert m0 == 1000.0


def test_sarah_jenkins_lvr_and_lmi():
    result = calculate_customer_lvr_and_serviceability("CUST-8821")
    assert result["status"] == "SUCCESS"
    assert result["customerId"] == "CUST-8821"
    assert result["customerName"] == "Sarah Jenkins"
    assert result["propertyValueAud"] == 1200000.0
    assert result["loanBalanceAud"] == 980000.0
    # LVR = 980,000 / 1,200,000 = 81.67%
    assert result["lvrPercent"] == 81.67
    assert result["lmiRequired"] is True
    assert result["lmiThresholdExceededByAud"] == 20000.0  # 980k - 960k (80% of 1.2M)
    assert result["dtiRatio"] == 5.94  # 980k / 165k
    assert result["baseMonthlyRepaymentAud"] > 5900.0
    assert result["stressedInterestRatePct"] == 9.15
    assert "AU-SYD CMEK" in result["storageResidency"]


def test_david_zhang_prime_compliant():
    result = calculate_customer_lvr_and_serviceability("CUST-1042")
    assert result["status"] == "SUCCESS"
    assert result["customerName"] == "David Zhang"
    # LVR = 510,000 / 850,000 = 60.00%
    assert result["lvrPercent"] == 60.0
    assert result["lmiRequired"] is False
    assert result["apraStressTestPassed"] is True
    assert result["riskTier"] == "PRIME_COMPLIANT"


def test_emma_watson_high_lvr():
    result = calculate_customer_lvr_and_serviceability("CUST-3310")
    assert result["status"] == "SUCCESS"
    assert result["customerName"] == "Emma Watson"
    # LVR = 590,000 / 650,000 = 90.77%
    assert result["lvrPercent"] == 90.77
    assert result["lmiRequired"] is True
    assert result["riskTier"] == "HIGH_RISK"


def test_customer_not_found():
    result = calculate_customer_lvr_and_serviceability("NON_EXISTENT_ID")
    assert result["status"] == "NOT_FOUND"
    assert "error" in result
    assert "CUST-8821" in result["availableCustomers"]


def test_dataset_summary_and_all_customers():
    summary = get_dataset_summary()
    assert summary["rowCount"] >= 5
    assert summary["stats"]["totalLoanBookAud"] > 3000000.0
    assert summary["stats"]["highLvrAccountsCount"] >= 2
    assert summary["storageResidency"]["jurisdiction"] == "australia-southeast1"


def test_schema_extraction_for_vertex_ai():
    schema = extract_tool_schema(calculate_customer_lvr_and_serviceability)
    assert schema["name"] == "calculate_customer_lvr_and_serviceability"
    assert "parameters" in schema
    assert "customer_id" in schema["parameters"]["properties"]
    assert "customer_id" in schema["parameters"]["required"]


@pytest.mark.asyncio
async def test_execute_tool_call_via_registry():
    tools = [calculate_customer_lvr_and_serviceability]
    exec_result = await execute_tool_call(
        tools=tools,
        tool_name="calculate_customer_lvr_and_serviceability",
        args={"customer_id": "CUST-8821"},
    )
    assert exec_result["error"] is None
    assert exec_result["result"]["status"] == "SUCCESS"
    assert exec_result["result"]["lvrPercent"] == 81.67


def test_custom_csv_ingest_and_reset(tmp_path):
    custom_csv = """customer_id,customer_name,property_value_aud,loan_balance_aud,annual_income_aud,monthly_expenses_aud,current_interest_rate_pct,loan_term_years
CUST-TEST1,Test User,1000000.00,500000.00,200000.00,3000.00,5.50,30
"""
    test_file = str(tmp_path / "test_loans.csv")
    summary = ingest_loans_csv(custom_csv, file_path=test_file)
    assert summary["rowCount"] == 1
    assert summary["rows"][0]["customerName"] == "Test User"
    assert summary["rows"][0]["lvrPercent"] == 50.0

    # Reset
    reset_summary = reset_default_loans(file_path=test_file)
    assert reset_summary["rowCount"] == 5
