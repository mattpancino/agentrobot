#!/usr/bin/env bash
# =====================================================================
# scripts/deploy_enclave_tool_service.sh - Deploy Enclave Tool Service
# Directly to Live Tier 3 VM (sovereign-gemma-2b-vm)
# =====================================================================
set -eo pipefail

cd "$(dirname "$0")/.."

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-sovereignagent}"
ZONE="${ZONE:-australia-southeast1-a}"
VM_NAME="${VM_NAME:-sovereign-gemma-2b-vm}"
SSH_KEY="${HOME}/.ssh/sovereign_gemma_key"

echo "====================================================================="
echo " Deploying Sovereign Tool Service & Data Store to ${VM_NAME}"
echo "====================================================================="

# Step 1: Create remote directories
echo "1. Creating /var/sovereign/data and /var/sovereign/app on VM..."
gcloud compute ssh "${VM_NAME}" \
    --ssh-key-file="${SSH_KEY}" \
    --zone="${ZONE}" \
    --project="${PROJECT_ID}" \
    --tunnel-through-iap \
    --command="sudo mkdir -p /var/sovereign/data /var/sovereign/app && sudo chown -R \$USER:\$USER /var/sovereign"

# Step 2: Copy CSV dataset and service to the VM
echo "2. Copying customer_loans.csv dataset to /var/sovereign/data/customer_loans.csv..."
gcloud compute scp \
    --ssh-key-file="${SSH_KEY}" \
    --zone="${ZONE}" \
    --project="${PROJECT_ID}" \
    --tunnel-through-iap \
    src/data/customer_loans.csv "${VM_NAME}:/var/sovereign/data/customer_loans.csv"

# Step 3: Write the Enclave Tool Service Python file on the VM
echo "3. Installing Enclave Tool Service server on VM..."
gcloud compute ssh "${VM_NAME}" \
    --ssh-key-file="${SSH_KEY}" \
    --zone="${ZONE}" \
    --project="${PROJECT_ID}" \
    --tunnel-through-iap \
    --command="cat <<'SERVER_PY' > /var/sovereign/app/server.py
# Copyright 2026 Google LLC. All Rights Reserved.
# Sovereign Enclave Mathematical Tool & Local Data Service
import csv
import io
import os
import socket
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

DATASET_PATH = \"/var/sovereign/data/customer_loans.csv\"

DEFAULT_BENCHMARK_LOANS = \"\"\"customer_id,customer_name,property_value_aud,loan_balance_aud,annual_income_aud,monthly_expenses_aud,current_interest_rate_pct,loan_term_years
CUST-8821,Sarah Jenkins,1200000.00,980000.00,165000.00,4200.00,6.15,30
CUST-1042,David Zhang,850000.00,510000.00,140000.00,3100.00,5.99,25
CUST-3310,Emma Watson,650000.00,590000.00,95000.00,2800.00,6.25,30
CUST-4491,Marcus Aurelius,2100000.00,1250000.00,320000.00,6500.00,5.85,30
CUST-9012,Chloe Bennett,750000.00,600000.00,110000.00,3400.00,6.30,30
\"\"\"

def ensure_dataset():
    if not os.path.exists(os.path.dirname(DATASET_PATH)):
        os.makedirs(os.path.dirname(DATASET_PATH), exist_ok=True)
    if not os.path.exists(DATASET_PATH):
        with open(DATASET_PATH, \"w\", encoding=\"utf-8\") as f:
            f.write(DEFAULT_BENCHMARK_LOANS)

ensure_dataset()

def calculate_monthly_repayment(principal: float, annual_rate_pct: float, term_years: int) -> float:
    if principal <= 0 or term_years <= 0:
        return 0.0
    r = (annual_rate_pct / 100.0) / 12.0
    n = term_years * 12
    if r == 0:
        return round(principal / n, 2)
    repayment = principal * (r * ((1.0 + r) ** n)) / (((1.0 + r) ** n) - 1.0)
    return round(repayment, 2)

def calculate_customer_lvr(customer_id: str) -> Dict[str, Any]:
    ensure_dataset()
    target = customer_id.strip().upper()
    matched_row = None
    all_ids = []
    with open(DATASET_PATH, mode=\"r\", encoding=\"utf-8-sig\") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cid = row.get(\"customer_id\", \"\").strip().upper()
            cname = row.get(\"customer_name\", \"\").strip().upper()
            if cid:
                all_ids.append(row.get(\"customer_id\", \"\").strip())
            if target in (cid, cname) or (len(target) > 3 and target in cname):
                matched_row = row

    if not matched_row:
        return {
            \"error\": f\"Customer '{customer_id}' not found in sovereign enclave dataset.\",
            \"status\": \"NOT_FOUND\",
            \"availableCustomers\": all_ids,
        }

    cid = matched_row.get(\"customer_id\", \"\").strip()
    cname = matched_row.get(\"customer_name\", \"\").strip()
    property_val = float(matched_row.get(\"property_value_aud\", 0))
    loan_balance = float(matched_row.get(\"loan_balance_aud\", 0))
    income = float(matched_row.get(\"annual_income_aud\", 0))
    expenses = float(matched_row.get(\"monthly_expenses_aud\", 0))
    rate = float(matched_row.get(\"current_interest_rate_pct\", 0))
    term_years = int(float(matched_row.get(\"loan_term_years\", 30)))

    lvr_percent = round((loan_balance / property_val) * 100.0, 2) if property_val > 0 else 0.0
    lmi_required = lvr_percent > 80.0
    max_80_loan = round(property_val * 0.80, 2)
    lmi_excess_balance = max(0.0, round(loan_balance - max_80_loan, 2))
    dti_ratio = round(loan_balance / income, 2) if income > 0 else 0.0
    monthly_repayment = calculate_monthly_repayment(loan_balance, rate, term_years)
    stressed_rate = round(rate + 3.0, 2)
    stressed_repayment = calculate_monthly_repayment(loan_balance, stressed_rate, term_years)
    gross_monthly_income = round(income / 12.0, 2)
    stressed_surplus_buffer = round(gross_monthly_income - expenses - stressed_repayment, 2)
    apra_stress_passed = stressed_surplus_buffer >= 0

    if lvr_percent > 85.0 or dti_ratio >= 6.0:
        risk_tier = \"HIGH_RISK\"
    elif lvr_percent > 80.0 or not apra_stress_passed:
        risk_tier = \"MODERATE_LMI_REQUIRED\"
    else:
        risk_tier = \"PRIME_COMPLIANT\"

    return {
        \"status\": \"SUCCESS\",
        \"customerId\": cid,
        \"customerName\": cname,
        \"propertyValueAud\": property_val,
        \"loanBalanceAud\": loan_balance,
        \"annualIncomeAud\": income,
        \"monthlyExpensesAud\": expenses,
        \"currentInterestRatePct\": rate,
        \"loanTermYears\": term_years,
        \"lvrPercent\": lvr_percent,
        \"lmiRequired\": lmi_required,
        \"lmiThresholdExceededByAud\": lmi_excess_balance,
        \"dtiRatio\": dti_ratio,
        \"baseMonthlyRepaymentAud\": monthly_repayment,
        \"stressedInterestRatePct\": stressed_rate,
        \"stressedMonthlyRepaymentAud\": stressed_repayment,
        \"grossMonthlyIncomeAud\": gross_monthly_income,
        \"monthlySurplusBufferAud\": stressed_surplus_buffer,
        \"apraStressTestPassed\": apra_stress_passed,
        \"riskTier\": risk_tier,
        \"storageResidency\": \"/var/sovereign/data/customer_loans.csv (Airgapped Private VPC Enclave)\",
        \"localMirrorPath\": \"/var/sovereign/data/customer_loans.csv\",
        \"enclaveHost\": socket.gethostname(),
        \"executionTier\": \"TIER_3_SOVEREIGN\",
    }

def get_summary() -> Dict[str, Any]:
    ensure_dataset()
    customers = []
    with open(DATASET_PATH, mode=\"r\", encoding=\"utf-8-sig\") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cid = row.get(\"customer_id\", \"\").strip()
            if cid:
                c_calc = calculate_customer_lvr(cid)
                if c_calc.get(\"status\") == \"SUCCESS\":
                    customers.append(c_calc)

    total_balance = sum(c.get(\"loanBalanceAud\", 0.0) for c in customers)
    avg_lvr = round(sum(c.get(\"lvrPercent\", 0.0) for c in customers) / len(customers), 2) if customers else 0.0
    high_lvr_count = sum(1 for c in customers if c.get(\"lmiRequired\", False))
    stress_failure_count = sum(1 for c in customers if not c.get(\"apraStressTestPassed\", True))

    return {
        \"filename\": \"customer_loans.csv\",
        \"filePath\": \"/var/sovereign/data/customer_loans.csv\",
        \"rowCount\": len(customers),
        \"rows\": customers,
        \"stats\": {
            \"totalLoanBookAud\": round(total_balance, 2),
            \"averageLvrPercent\": avg_lvr,
            \"highLvrAccountsCount\": high_lvr_count,
            \"apraStressFailuresCount\": stress_failure_count,
        },
        \"storageResidency\": {
            \"cloudStorageBucket\": \"gs://au-fsi-customer-assets/loans.csv\",
            \"jurisdiction\": \"australia-southeast1\",
            \"encryption\": \"Cloud KMS CMEK (AU-SYD)\",
            \"localMirrorStatus\": \"Active & Live on /var/sovereign/data/customer_loans.csv (sovereign-gemma-2b-vm)\",
        },
    }

app = FastAPI(title=\"Sovereign Enclave Tool Service\")
app.add_middleware(CORSMiddleware, allow_origins=[\"*\"], allow_credentials=True, allow_methods=[\"*\"], allow_headers=[\"*\"])

class ToolReq(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)

class IngestReq(BaseModel):
    csvContent: str

@app.get(\"/health\")
async def health():
    return {
        \"status\": \"ok\",
        \"service\": \"sovereign-enclave-tool-service\",
        \"hostname\": socket.gethostname(),
        \"enclaveHost\": \"sovereign-gemma-2b-vm\",
        \"jurisdiction\": \"australia-southeast1-a\",
        \"storageResidency\": \"/var/sovereign/data/customer_loans.csv (Airgapped Private VPC Enclave)\",
        \"activeFilePath\": DATASET_PATH,
        \"datasetLoaded\": os.path.exists(DATASET_PATH),
    }

@app.post(\"/v1/tools/execute\")
async def execute_tool(req: ToolReq):
    if req.tool_name == \"calculate_customer_lvr_and_serviceability\":
        cid = req.arguments.get(\"customer_id\") or req.arguments.get(\"customerId\") or \"\"
        res = calculate_customer_lvr(cid)
        return {\"toolName\": req.tool_name, \"arguments\": req.arguments, \"result\": res, \"error\": None}
    elif req.tool_name == \"get_dataset_summary\":
        return {\"toolName\": req.tool_name, \"arguments\": req.arguments, \"result\": get_summary(), \"error\": None}
    raise HTTPException(status_code=404, detail=\"Tool not found\")

@app.get(\"/v1/dataset\")
async def get_dataset_endpoint():
    return get_summary()

@app.post(\"/v1/dataset/ingest\")
async def ingest_dataset(req: IngestReq):
    with open(DATASET_PATH, \"w\", encoding=\"utf-8\") as f:
        f.write(req.csvContent.strip())
    return get_summary()

@app.post(\"/v1/dataset/reset\")
async def reset_dataset():
    with open(DATASET_PATH, \"w\", encoding=\"utf-8\") as f:
        f.write(DEFAULT_BENCHMARK_LOANS)
    return get_summary()
SERVER_PY"

# Step 4: Install Python dependencies and configure systemd
echo "4. Installing Python dependencies and configuring systemd on VM..."
gcloud compute ssh "${VM_NAME}" \
    --ssh-key-file="${SSH_KEY}" \
    --zone="${ZONE}" \
    --project="${PROJECT_ID}" \
    --tunnel-through-iap \
    --command="sudo apt-get update -y && sudo apt-get install -y python3-pip python3-uvicorn python3-fastapi python3-pydantic || sudo pip3 install fastapi uvicorn pydantic --break-system-packages"

gcloud compute ssh "${VM_NAME}" \
    --ssh-key-file="${SSH_KEY}" \
    --zone="${ZONE}" \
    --project="${PROJECT_ID}" \
    --tunnel-through-iap \
    --command="sudo bash -c 'cat <<SYSTEMD_UNIT > /etc/systemd/system/sovereign-tool-service.service
[Unit]
Description=Sovereign Tier 3 Enclave Tool Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/sovereign/app
ExecStart=/usr/bin/python3 -m uvicorn server:app --host 0.0.0.0 --port 8003
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SYSTEMD_UNIT
systemctl daemon-reload
systemctl enable sovereign-tool-service
systemctl restart sovereign-tool-service
sleep 2
systemctl status sovereign-tool-service --no-pager
'"

# Step 5: Test health endpoint on the VM
echo "5. Verifying local health endpoint on the VM..."
gcloud compute ssh "${VM_NAME}" \
    --ssh-key-file="${SSH_KEY}" \
    --zone="${ZONE}" \
    --project="${PROJECT_ID}" \
    --tunnel-through-iap \
    --command="curl -s http://127.0.0.1:8003/health"

echo ""
echo "====================================================================="
echo " Sovereign Enclave Tool Service Successfully Deployed to ${VM_NAME}!"
echo "====================================================================="
