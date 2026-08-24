---
name: apra-cps234-underwriting
description: APRA CPS 234 and APS 220 Sovereign Credit Risk & LVR Underwriting Directives for Australian Banking.
version: 1.2.0
jurisdiction: au-southeast1
author: sovereign-fsi-risk-governance
tools:
  - calculate_customer_lvr_and_serviceability
  - get_dataset_summary
---

# APRA CPS 234 & APS 220 Sovereign Credit Underwriting Skill

## 1. Regulatory Context & Sovereign Directives
- **APRA CPS 234 (Information Security - Clause 23 Data Residency):**
  Customer financial data, income statements, and loan balances must not egress outside Australian jurisdictional boundaries (`australia-southeast1`) or untrusted public networks.
- **Zero-PII Tokenization Mandate:**
  Sensitive customer identifiers (e.g. Full Name, Tax File Number, Medicare, Account Numbers) must be intercepted and replaced with deterministic pseudonymized tokens (`[[PII_PERSON_001]]`) prior to any cross-network or external model transit.

## 2. Deterministic Tool Calling Mandates
- **Zero Mathematical Hallucination:**
  The agent is strictly forbidden from estimating, calculating, or synthesizing loan balance calculations, LVR, LMI premiums, or serviceability buffers via generative LLM completion.
- **Mandatory Tool Binding:**
  All portfolio figures and stress test assessments must be computed by executing the deterministic Python function:
  `calculate_customer_lvr_and_serviceability(customer_name, new_property_value, requested_loan_amount, interest_rate, loan_term_years)`

## 3. Mathematical Underwriting & Risk Formulas
- **Loan-to-Value Ratio (LVR):**
  $$\text{LVR} = \left(\frac{\text{Requested Loan Amount}}{\text{Property Valuation}}\right) \times 100$$
  *Policy Threshold:* If $\text{LVR} > 80.0\%$, Lenders Mortgage Insurance (LMI) is mandatory.

- **APRA Prudential Serviceability Buffer (+3.00%):**
  $$\text{Stressed Rate} = \text{Base Interest Rate} + 3.00\%$$
  *Serviceability Criteria:* Monthly Net Surplus = Gross Monthly Income - Non-Housing Expenses - Stressed P&I Payment $\ge \$0.00$.

- **Debt-to-Income (DTI) Macroprudential Limit:**
  $$\text{DTI} = \frac{\text{Total Existing & New Debt}}{\text{Gross Annual Income}}$$
  *High-Risk Flag:* $\text{DTI} \ge 6.0\text{x}$ requires escalation to Senior Underwriting Review.

- **Standard Monthly Amortization (P&I):**
  $$M = P \times \frac{r(1+r)^n}{(1+r)^n - 1}$$
  Where $P$ is principal, $r$ is monthly interest rate, and $n$ is total payments.

## 4. Multi-Tier Sovereign Failover Behavior
- **Tier 1 (Global Public API):**
  Full PII tokenization applied before prompt transit. Tool calls execute locally in Sydney runtime.
- **Tier 2 (Regional AU-SYD Vertex AI):**
  Strict Australian jurisdictional boundary. Session context replicated in local Redis.
- **Tier 3 (Sovereign Airgapped Enclave VM):**
  Zero external internet access. Self-hosted Gemma 2 model and local CSV data store (`/var/sovereign/data/customer_loans.csv`) with offline tool execution.
