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

export const ArchitectureInfoModal: React.FC<ArchitectureInfoModalProps> = ({
  modalState,
  onClose,
  descriptions,
  datasetSummary,
  onOpenSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

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
            <span className="text-2xl">{icon || (type === 'tool_dataset' ? '🔧' : type === 'skill_rulebook' ? '🧠' : '⚙️')}</span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {title || (functionKey && ARCHITECTURE_FUNCTION_METADATA[functionKey]?.label) || 'Architecture Component'}
              </h2>
              <p className="text-xs text-slate-400">
                {type === 'tool_dataset' && 'Deterministic Tool Interface & Live Loan Dataset Preview'}
                {type === 'skill_rulebook' && 'APRA CPS 234 / APS 220 Sovereign Skill Specification'}
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

          {/* 3. SKILL RULEBOOK POPUP */}
          {type === 'skill_rulebook' && (
            <div className="space-y-5">
              {/* Skill Specification Header Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/30 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white font-sans">
                      {activeValue || 'APRA Enclave Rulebook (Local VPC)'}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                      APRA CPS 234 / APS 220
                    </span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">Jurisdiction: AU-SYD Domestic</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  The active sovereign skill defines strict regulatory guardrails, calculation mandates, and deterministic risk boundaries ensuring institutional compliance across all execution tiers.
                </p>
              </div>

              {/* Directives & Guardrails */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="text-xs font-bold text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
                  <span>📜</span>
                  <span>Core Regulatory Directives &amp; Guardrails</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 font-sans">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 font-bold shrink-0">1.</span>
                    <span>
                      <strong className="text-white">APRA CPS 234 Clause 23 (Data Residency):</strong> Customer financial data, income statements, and loan balances must not egress outside Australian jurisdictional boundaries or untrusted networks.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 font-bold shrink-0">2.</span>
                    <span>
                      <strong className="text-white">Deterministic Tool Mandate:</strong> The agent is forbidden from estimating loan calculations via LLM completion. All figures (LVR, LMI, monthly repayments, stress buffer) must be computed via <code className="text-emerald-300 font-mono text-[11px]">calculate_customer_lvr</code>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 font-bold shrink-0">3.</span>
                    <span>
                      <strong className="text-white">Zero-PII Tokenization:</strong> Sensitive identifiers (e.g. Sarah Jenkins, TFN, Medicare, account numbers) are replaced with pseudonymized tokens (<code className="text-purple-300 font-mono text-[11px]">[[PII_PERSON_001]]</code>) prior to external model routing.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Mathematical Underwriting Rulebook */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5 font-sans">
                  <span>📐</span>
                  <span>Mathematical Underwriting Rulebook</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* LVR Formula */}
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">1. Loan-to-Value Ratio (LVR)</div>
                    <div className="text-emerald-300 font-bold">LVR = (Loan Balance / Property Value) × 100</div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      Threshold: If LVR &gt; 80.0%, Lenders Mortgage Insurance (LMI) is mandatory.
                    </div>
                  </div>

                  {/* APRA Stress Test Formula */}
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">2. APRA +3.0% Stress Buffer</div>
                    <div className="text-amber-300 font-bold">Stressed Rate = Base Rate + 3.00%</div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      Buffer: (Gross Monthly Income - Expenses - Stressed P&amp;I) must be &ge; $0.00.
                    </div>
                  </div>

                  {/* Debt-to-Income */}
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">3. Debt-to-Income (DTI)</div>
                    <div className="text-blue-300 font-bold">DTI = Total Debt / Gross Annual Income</div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      High-Risk Flag: DTI &ge; 6.0x triggers macroprudential credit review.
                    </div>
                  </div>

                  {/* Amortization Formula */}
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">4. Monthly Amortization</div>
                    <div className="text-purple-300 font-bold">M = P × [r(1+r)ⁿ] / [(1+r)ⁿ - 1]</div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      Exact monthly principal and interest payment calculation.
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end">
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
        </div>
      </div>
    </div>
  );
};
