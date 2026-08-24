// Copyright 2026 Google LLC. All Rights Reserved.
import React, { useState, useMemo } from 'react';
import {
  ArchitectureModalState,
  ArchitectureDescriptionMap,
  DatasetSummary,
  LoanCustomerRow,
} from '../types';
import {
  DEFAULT_ARCHITECTURE_DESCRIPTIONS,
  ARCHITECTURE_FUNCTION_METADATA,
} from '../defaultArchitectureDescriptions';

interface ArchitectureInfoModalProps {
  modalState: ArchitectureModalState | null;
  onClose: () => void;
  descriptions: ArchitectureDescriptionMap;
  datasetSummary?: DatasetSummary | null;
  onOpenSettings?: (tab?: string) => void;
}

const RAW_SKILL_MD = `---
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
  Customer financial data, income statements, and loan balances must not egress outside Australian jurisdictional boundaries (australia-southeast1) or untrusted public networks.
- **Zero-PII Tokenization Mandate:**
  Sensitive customer identifiers (e.g. Full Name, Tax File Number, Medicare, Account Numbers) must be intercepted and replaced with deterministic pseudonymized tokens ([[PII_PERSON_001]]) prior to any cross-network or external model transit.

## 2. Deterministic Tool Calling Mandates
- **Zero Mathematical Hallucination:**
  The agent is strictly forbidden from estimating, calculating, or synthesizing loan balance calculations, LVR, LMI premiums, or serviceability buffers via generative LLM completion.
- **Mandatory Tool Binding:**
  All portfolio figures and stress test assessments must be computed by executing the deterministic Python function:
  calculate_customer_lvr_and_serviceability(customer_name, new_property_value, requested_loan_amount, interest_rate, loan_term_years)

## 3. Mathematical Underwriting & Risk Formulas
- **Loan-to-Value Ratio (LVR):**
  LVR = (Requested Loan Amount / Property Valuation) × 100
  *Policy Threshold:* If LVR > 80.0%, Lenders Mortgage Insurance (LMI) is mandatory.

- **APRA Prudential Serviceability Buffer (+3.00%):**
  Stressed Rate = Base Interest Rate + 3.00%
  *Serviceability Criteria:* Monthly Net Surplus = Gross Monthly Income - Non-Housing Expenses - Stressed P&I Payment >= $0.00.

- **Debt-to-Income (DTI) Macroprudential Limit:**
  DTI = Total Existing & New Debt / Gross Annual Income
  *High-Risk Flag:* DTI >= 6.0x requires escalation to Senior Underwriting Review.

- **Standard Monthly Amortization (P&I):**
  M = P × [r(1+r)^n] / [(1+r)^n - 1]
  Where P is principal, r is monthly interest rate, and n is total payments.

## 4. Multi-Tier Sovereign Failover Behavior
- **Tier 1 (Global Public API):**
  Full PII tokenization applied before prompt transit. Tool calls execute locally in Sydney runtime.
- **Tier 2 (Regional AU-SYD Vertex AI):**
  Strict Australian jurisdictional boundary. Session context replicated in local Redis.
- **Tier 3 (Sovereign Airgapped Enclave VM):**
  Zero external internet access. Self-hosted Gemma 2 model and local CSV data store (/var/sovereign/data/customer_loans.csv) with offline tool execution.
`;

export const ArchitectureInfoModal: React.FC<ArchitectureInfoModalProps> = ({
  modalState,
  onClose,
  descriptions,
  datasetSummary,
  onOpenSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  if (!modalState) return null;

  const { type, functionKey, title, icon, activeValue, activeColor } = modalState;

  // 1. SMALL FLOATING FUNCTION DESCRIPTION POPUP
  if (type === 'function_desc' && functionKey) {
    const descText = descriptions[functionKey] || DEFAULT_ARCHITECTURE_DESCRIPTIONS[functionKey];
    const meta = ARCHITECTURE_FUNCTION_METADATA[functionKey];

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm bg-slate-900/95 border border-slate-700/90 rounded-2xl shadow-2xl shadow-black/70 p-4 space-y-2.5 animate-in zoom-in-95 duration-150 backdrop-blur-md text-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-lg">{icon || meta?.icon || '⚙️'}</span>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                {title || meta?.label || 'Function Description'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition"
              title="Close"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {descText}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{type === 'skill_rulebook' ? '📄' : (icon || (type === 'tool_dataset' ? '🔧' : '⚙️'))}</span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                {type === 'skill_rulebook'
                  ? 'skills/apra_underwriting/SKILL.md'
                  : (title || (functionKey && ARCHITECTURE_FUNCTION_METADATA[functionKey]?.label) || 'Architecture Component')}
              </h2>
              <p className="text-xs text-slate-400">
                {type === 'tool_dataset' && 'Deterministic Tool Interface & Live Loan Dataset Preview'}
                {type === 'skill_rulebook' && 'Active Sovereign Agent Skill · YAML Frontmatter & Directives'}
                {type === 'function_desc' && 'Architectural Subsystem Overview'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close popup (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-200">

          {/* 2. TOOL DATASET POPUP */}
          {type === 'tool_dataset' && (
            <div className="space-y-5">
              {/* Tool Signature Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold text-sm">calculate_customer_lvr</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      DETERMINISTIC PYTHON TOOL
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">{activeValue || 'Airgap Enclave / Local VM Engine'}</span>
                </div>
                <div className="text-xs text-slate-300 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-purple-400">def</span>{' '}
                  <span className="text-emerald-300 font-semibold">calculate_customer_lvr_and_serviceability</span>(
                  <span className="text-amber-300">customer_id</span>: <span className="text-blue-300">str</span>,{' '}
                  <span className="text-amber-300">file_path</span>: <span className="text-blue-300">str</span> ={' '}
                  <span className="text-emerald-200">"/var/sovereign/data/customer_loans.csv"</span>) -&gt;{' '}
                  <span className="text-blue-300">Dict[str, Any]</span>:
                </div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Computes exact Loan-to-Value Ratio (LVR), Lenders Mortgage Insurance (LMI) 80% boundary, Debt-to-Income (DTI), base amortized monthly repayment, and APRA +3.0% rate shock stress buffers with zero LLM hallucination.
                </p>
              </div>

              {/* Aggregate Stats */}
              {datasetSummary && datasetSummary.stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono">
                    <span className="text-[10px] text-slate-500 block uppercase">Total Portfolio</span>
                    <span className="text-sm font-bold text-white">
                      ${datasetSummary.stats.totalLoanBookAud?.toLocaleString()} AUD
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono">
                    <span className="text-[10px] text-slate-500 block uppercase">Average LVR</span>
                    <span className="text-sm font-bold text-amber-400">
                      {datasetSummary.stats.averageLvrPercent}%
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono">
                    <span className="text-[10px] text-slate-500 block uppercase">High LVR (&gt;80%)</span>
                    <span className="text-sm font-bold text-rose-400">
                      {datasetSummary.stats.highLvrAccountsCount} Accounts
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono">
                    <span className="text-[10px] text-slate-500 block uppercase">Stress Failures</span>
                    <span className="text-sm font-bold text-purple-400">
                      {datasetSummary.stats.apraStressFailuresCount} Accounts
                    </span>
                  </div>
                </div>
              )}

              {/* Search and Live Dataset Table */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>📊 Ingested Customer Loan Records</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                      {datasetSummary?.rows?.length || 0} Records
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Search borrower or ID (e.g. Jenkins, CUST-8821)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 w-full sm:w-64"
                  />
                </div>

                <div className="max-h-56 overflow-y-auto overflow-x-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="p-2">Customer ID</th>
                        <th className="p-2">Borrower</th>
                        <th className="p-2">Property Value</th>
                        <th className="p-2">Loan Balance</th>
                        <th className="p-2">LVR (%)</th>
                        <th className="p-2">LMI Status</th>
                        <th className="p-2">APRA Stress (+3%)</th>
                        <th className="p-2">Risk Tier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {datasetSummary?.rows && datasetSummary.rows.length > 0 ? (
                        datasetSummary.rows
                          .filter((r) => {
                            if (!searchQuery) return true;
                            const q = searchQuery.toLowerCase();
                            return (
                              r.customerId?.toLowerCase().includes(q) ||
                              r.customerName?.toLowerCase().includes(q)
                            );
                          })
                          .map((r, idx) => {
                            const isHighLvr = (r.lvrPercent || 0) > 80.0;
                            const isStressPass = r.apraStressTestPassed;
                            return (
                              <tr key={idx} className="hover:bg-slate-900/60 transition">
                                <td className="p-2 font-bold text-blue-400">{r.customerId}</td>
                                <td className="p-2 text-white font-sans">{r.customerName}</td>
                                <td className="p-2">${r.propertyValueAud?.toLocaleString()}</td>
                                <td className="p-2 font-semibold text-slate-200">${r.loanBalanceAud?.toLocaleString()}</td>
                                <td className={`p-2 font-bold ${isHighLvr ? 'text-amber-400' : 'text-emerald-400'}`}>
                                  {r.lvrPercent?.toFixed(2)}%
                                </td>
                                <td className="p-2">
                                  {isHighLvr ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      LMI Required
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      Exempt
                                    </span>
                                  )}
                                </td>
                                <td className="p-2">
                                  {isStressPass ? (
                                    <span className="text-emerald-400 font-semibold">✓ Pass (+${r.monthlySurplusBufferAud?.toFixed(0)}/mo)</span>
                                  ) : (
                                    <span className="text-rose-400 font-semibold">✕ Fail</span>
                                  )}
                                </td>
                                <td className="p-2">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                      r.riskTier === 'PRIME_COMPLIANT'
                                        ? 'bg-blue-500/10 text-blue-300'
                                        : 'bg-rose-500/10 text-rose-300'
                                    }`}
                                  >
                                    {r.riskTier || 'PRIME'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-slate-500">
                            No customer records loaded. Check dataset ingestion in Settings.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Storage Residency Note */}
                <div className="text-[11px] font-mono text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span>
                    Storage Source: <strong className="text-amber-300">gs://au-fsi-customer-assets/loans.csv</strong> (AU-SYD CMEK)
                  </span>
                  <span className="text-emerald-400 font-semibold">Synchronized to Local Enclave</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenSettings) onOpenSettings('dataset');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-semibold border border-amber-500/40 flex items-center gap-2 transition"
                >
                  <span>📊</span>
                  <span>Manage Dataset &amp; Ingest CSVs in Settings</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* 3. SKILL RULEBOOK POPUP - PURE SKILL.MD TEXT FIELD */}
          {type === 'skill_rulebook' && (
            <div className="space-y-3">
              {/* File Info Bar with Copy Action */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-950/90 rounded-xl border border-purple-500/30 text-xs font-mono">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="text-purple-400">📄</span>
                  <span className="font-bold text-white font-mono">skills/apra_underwriting/SKILL.md</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                    YAML Frontmatter &amp; Directives
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(RAW_SKILL_MD);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition border border-slate-700 shadow-sm cursor-pointer"
                    title="Copy entire SKILL.md text to clipboard"
                  >
                    <span>{copied ? '✓' : '📋'}</span>
                    <span>{copied ? 'Copied Raw SKILL.md!' : 'Copy Raw SKILL.md'}</span>
                  </button>
                </div>
              </div>

              {/* Raw Monospace Text Editor Field */}
              <div className="relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
                <div className="p-4 font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto whitespace-pre select-text selection:bg-purple-900/60 selection:text-white max-h-[58vh] bg-slate-950 font-mono">
                  {RAW_SKILL_MD}
                </div>
              </div>

              {/* Footer Note and Close */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">●</span>
                  <span>Active Sovereign Agent Skill loaded from <code className="text-purple-300 font-mono">skills/apra_underwriting/SKILL.md</code></span>
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
