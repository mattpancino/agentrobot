# Copyright 2026 Google LLC. All Rights Reserved.
# Script to update src/backend/static/index.html with interactive architecture popups, configurable settings, tool dataset viewer, and skill rulebook.
import re

with open("src/backend/static/index.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. Add DEFAULT_ARCHITECTURE_DESCRIPTIONS and ARCHITECTURE_FUNCTION_METADATA constants
arch_constants = '''    const DEFAULT_ARCHITECTURE_DESCRIPTIONS = {
      runtime:
        'Executes the agent core logic, session orchestration, and stateful turn loop within governed boundary isolation (Vertex AI Agent Engine in AU-SYD vs. Private Airgapped VPC Enclave).',
      modelLocation:
        'Defines physical data residency and geographical jurisdiction for model inference (e.g. Global Multi-Region API, Sydney australia-southeast1, or Local On-Prem Enclave).',
      model:
        'The active Large Language Model executing token generation (e.g., Gemini 3.7 Flash frontier model, Gemini 2.5 Flash regional model, or self-hosted Gemma 2 open weights).',
      memory:
        'The stateful conversation persistence layer ensuring session context continuity across failover hops (dual-tier replicating Redis store & Vertex AI Managed Sessions).',
      piiCleanser:
        'Deterministic zero-egress privacy engine intercepting and pseudonymizing sensitive entities (TFNs, Medicare, BSB, Customer Names) before prompt transit.',
      skill:
        'Domain-specific reasoning directives and regulatory rulebooks (such as APRA CPS 234 & APS 220 compliance frameworks) guiding agent actions and decision criteria.',
      tool:
        'Deterministic typed Python functions enabling exact mathematical computations, portfolio calculations, and structured dataset queries without LLM hallucination.',
      storageRest:
        'Governed data storage residency at rest (CMEK-encrypted Cloud Storage gs://au-fsi-customer-assets/ and local airgapped disk mirrors at /src/data).',
    };

    const ARCHITECTURE_FUNCTION_METADATA = {
      runtime: {
        label: 'Execution Runtime',
        icon: '⚙️',
        category: 'Compute & Orchestration',
        technicalDoc:
          'Provides the sandboxed execution environment for the agent orchestrator. In Tier 1 and 2, leverages Vertex AI Agent Engine with regional compliance. In Tier 3, executes on isolated Compute Engine / GKE nodes in an airgapped VPC.',
      },
      modelLocation: {
        label: 'Model Location & Data Residency',
        icon: '📍',
        category: 'Jurisdictional Sovereignty',
        technicalDoc:
          'Enforces sovereign boundary compliance. Under Australian APRA CPS 234 regulations, customer financial context must be restricted to Australian data centers (australia-southeast1) or on-prem enclave storage.',
      },
      model: {
        label: 'Foundation Model',
        icon: '⚡',
        category: 'LLM Intelligence',
        technicalDoc:
          'Dynamically routed LLM tier. When higher-tier API quotas fail or cross-border connections sever, the routing engine switches models down the cascade without losing context.',
      },
      memory: {
        label: 'Stateful Memory & Session Store',
        icon: '💾',
        category: 'State Persistence',
        technicalDoc:
          'Dual-tier session synchronization mechanism. Every conversation turn is written to both the hot primary session store and an asynchronous replication standby replica to guarantee instant recovery upon failover.',
      },
      piiCleanser: {
        label: 'PII Cleanser & Cryptographic Tokenizer',
        icon: '🛡️',
        category: 'Zero-Trust Privacy',
        technicalDoc:
          'High-performance tokenization sidecar utilizing Microsoft Presidio and spaCy NER. Tokenizes Tax File Numbers, Medicare numbers, and personal identities with session-isolated salts before sending queries to LLMs.',
      },
      skill: {
        label: 'Sovereign Agent Skill',
        icon: '🧠',
        category: 'Domain Directives & Governance',
        technicalDoc:
          'Encapsulates regulatory rulebooks (e.g. APRA CPS 234 Underwriter) and procedural instructions that ensure the agent adheres strictly to institutional credit risk and compliance guidelines.',
      },
      tool: {
        label: 'Deterministic Tool',
        icon: '🔧',
        category: 'Mathematical Tooling',
        technicalDoc:
          'Institutional Python calculations (LVR, DTI, monthly amortization, APRA +3% rate shock buffers) invoked deterministically to avoid mathematical hallucination.',
      },
      storageRest: {
        label: 'Storage at Rest Residency',
        icon: '📁',
        category: 'Data Governance',
        technicalDoc:
          'Secures enterprise datasets and audit logs. Governed by Customer-Managed Encryption Keys (CMEK) in regional cloud storage, mirrored locally in airgapped enclaves.',
      },
    };
'''

if "DEFAULT_ARCHITECTURE_DESCRIPTIONS" not in html:
    html = html.replace("const { useState, useEffect } = React;", f"const {{ useState, useEffect }} = React;\n\n{arch_constants}")

# 2. Update ChaosPanel signature in index.html
old_chaos_sig = "function ChaosPanel({ controls, onChange, onResetChat, onOpenSettings, onSelectStage }) {"
new_chaos_sig = "function ChaosPanel({ controls, onChange, onResetChat, onOpenSettings, onSelectStage, onOpenArchitectureModal }) {"
html = html.replace(old_chaos_sig, new_chaos_sig)

# 3. Update the architecture card in ChaosPanel inside index.html
old_arch_block_regex = r"\{/\* Integrated Architecture Elements for Active Tier \(Color-coded by location\) \*/\}[\s\S]*?\{/\* 1\. Manual Tier Override"

new_arch_block = '''{/* Integrated Architecture Elements for Active Tier (Interactive Popups) */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-1.5 text-[11px] font-mono leading-tight">
                {/* 1. Runtime */}
                <div
                  onClick={() =>
                    onOpenArchitectureModal &&
                    onOpenArchitectureModal({
                      type: 'function_desc',
                      functionKey: 'runtime',
                      title: '⚙️ Execution Runtime',
                      icon: '⚙️',
                      activeValue: agentChar.runtime,
                      activeColor: agentChar.runtimeColor,
                    })
                  }
                  className="flex items-start justify-between gap-2 p-1 rounded hover:bg-slate-900/90 cursor-pointer transition text-slate-400 group"
                  title="Click to view Execution Runtime architecture & role"
                >
                  <span className="text-slate-500 shrink-0 group-hover:text-blue-400 flex items-center gap-1">
                    <span>⚙️</span>
                    <span className="underline decoration-dotted decoration-slate-600 group-hover:decoration-blue-400">
                      Runtime:
                    </span>
                  </span>
                  <span className={`text-right font-sans ${agentChar.runtimeColor}`}>
                    {agentChar.runtime}
                  </span>
                </div>

                {/* 2. Model Location */}
                <div
                  onClick={() =>
                    onOpenArchitectureModal &&
                    onOpenArchitectureModal({
                      type: 'function_desc',
                      functionKey: 'modelLocation',
                      title: '📍 Model Location & Data Residency',
                      icon: '📍',
                      activeValue: agentChar.modelLocation,
                      activeColor: agentChar.modelLocationColor,
                    })
                  }
                  className="flex items-start justify-between gap-2 p-1 rounded hover:bg-slate-900/90 cursor-pointer transition text-slate-400 group"
                  title="Click to view Model Location and Data Residency compliance"
                >
                  <span className="text-slate-500 shrink-0 group-hover:text-blue-400 flex items-center gap-1">
                    <span>📍</span>
                    <span className="underline decoration-dotted decoration-slate-600 group-hover:decoration-blue-400">
                      Model Location:
                    </span>
                  </span>
                  <span className={`text-right font-sans ${agentChar.modelLocationColor}`}>
                    {agentChar.modelLocation}
                  </span>
                </div>

                {/* 3. Model */}
                <div
                  onClick={() =>
                    onOpenArchitectureModal &&
                    onOpenArchitectureModal({
                      type: 'function_desc',
                      functionKey: 'model',
                      title: '⚡ Foundation Model Tier',
                      icon: '⚡',
                      activeValue: agentChar.model,
                      activeColor: agentChar.modelColor,
                    })
                  }
                  className="flex items-start justify-between gap-2 p-1 rounded hover:bg-slate-900/90 cursor-pointer transition text-slate-400 group"
                  title="Click to view Model selection & failover specifications"
                >
                  <span className="text-slate-500 shrink-0 group-hover:text-blue-400 flex items-center gap-1">
                    <span>⚡</span>
                    <span className="underline decoration-dotted decoration-slate-600 group-hover:decoration-blue-400">
                      Model:
                    </span>
                  </span>
                  <span className={`text-right font-sans ${agentChar.modelColor}`}>
                    {agentChar.model}
                  </span>
                </div>

                {/* 4. Memory */}
                <div
                  onClick={() =>
                    onOpenArchitectureModal &&
                    onOpenArchitectureModal({
                      type: 'function_desc',
                      functionKey: 'memory',
                      title: '💾 Stateful Memory & Session Store',
                      icon: '💾',
                      activeValue: agentChar.memory,
                      activeColor: agentChar.memoryColor,
                    })
                  }
                  className="flex items-start justify-between gap-2 p-1 rounded hover:bg-slate-900/90 cursor-pointer transition text-slate-400 group"
                  title="Click to view Memory persistence & replication architecture"
                >
                  <span className="text-slate-500 shrink-0 group-hover:text-blue-400 flex items-center gap-1">
                    <span>💾</span>
                    <span className="underline decoration-dotted decoration-slate-600 group-hover:decoration-blue-400">
                      Memory:
                    </span>
                  </span>
                  <span className={`text-right font-sans ${agentChar.memoryColor}`}>
                    {agentChar.memory}
                  </span>
                </div>

                {/* 5. PII Cleanser */}
                {controls.enablePiiTokenizer && (
                  <div
                    onClick={() =>
                      onOpenArchitectureModal &&
                      onOpenArchitectureModal({
                        type: 'function_desc',
                        functionKey: 'piiCleanser',
                        title: '🛡️ PII Cleanser & Cryptographic Tokenizer',
                        icon: '🛡️',
                        activeValue: agentChar.piiCleanser,
                        activeColor: agentChar.piiCleanserColor,
                      })
                    }
                    className="flex items-start justify-between gap-2 p-1 rounded hover:bg-slate-900/90 cursor-pointer transition text-slate-400 group border-t border-slate-800/60 pt-1.5"
                    title="Click to view PII Cleanser entity recognition specifications"
                  >
                    <span className="text-slate-500 shrink-0 group-hover:text-purple-400 flex items-center gap-1">
                      <span>🛡️</span>
                      <span className="underline decoration-dotted decoration-slate-600 group-hover:decoration-purple-400">
                        PII Cleanser:
                      </span>
                    </span>
                    <span className={`text-right font-sans ${agentChar.piiCleanserColor}`}>
                      {agentChar.piiCleanser}
                    </span>
                  </div>
                )}

                {/* 6. Skill */}
                {controls.enterpriseDataEnabled && (
                  <>
                    <div
                      className={`flex items-start justify-between gap-2 p-1 rounded hover:bg-slate-900/90 transition text-slate-400 group ${
                        !controls.enablePiiTokenizer ? 'border-t border-slate-800/60 pt-1.5' : ''
                      }`}
                    >
                      <span
                        onClick={() =>
                          onOpenArchitectureModal &&
                          onOpenArchitectureModal({
                            type: 'function_desc',
                            functionKey: 'skill',
                            title: '🧠 Sovereign Agent Skill',
                            icon: '🧠',
                            activeValue: agentChar.skill,
                            activeColor: agentChar.skillColor,
                          })
                        }
                        className="text-slate-500 shrink-0 group-hover:text-purple-400 flex items-center gap-1 cursor-pointer"
                        title="Click to view Skill architectural documentation"
                      >
                        <span>🧠</span>
                        <span className="underline decoration-dotted decoration-slate-600 group-hover:decoration-purple-400">
                          Skill:
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenArchitectureModal &&
                            onOpenArchitectureModal({
                              type: 'skill_rulebook',
                              title: `🧠 ${agentChar.skill}`,
                              icon: '🧠',
                              activeValue: agentChar.skill,
                              activeColor: agentChar.skillColor,
                            });
                        }}
                        className={`text-right font-sans hover:underline hover:brightness-125 cursor-pointer ${agentChar.skillColor}`}
                        title="Click to view actual APRA CPS 234 Skill rulebook & guidelines"
                      >
                        {agentChar.skill} ↗
                      </button>
                    </div>

                    {/* 7. Tool */}
                    <div className="flex items-start justify-between gap-2 p-1 rounded hover:bg-slate-900/90 transition text-slate-400 group">
                      <span
                        onClick={() =>
                          onOpenArchitectureModal &&
                          onOpenArchitectureModal({
                            type: 'function_desc',
                            functionKey: 'tool',
                            title: '🔧 Deterministic Tool',
                            icon: '🔧',
                            activeValue: agentChar.tool,
                            activeColor: agentChar.toolColor,
                          })
                        }
                        className="text-slate-500 shrink-0 group-hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                        title="Click to view Tool architectural documentation"
                      >
                        <span>🔧</span>
                        <span className="underline decoration-dotted decoration-slate-600 group-hover:decoration-emerald-400">
                          Tool:
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenArchitectureModal &&
                            onOpenArchitectureModal({
                              type: 'tool_dataset',
                              title: `🔧 calculate_customer_lvr`,
                              icon: '🔧',
                              activeValue: agentChar.tool,
                              activeColor: agentChar.toolColor,
                            });
                        }}
                        className={`text-right font-sans hover:underline hover:brightness-125 cursor-pointer ${agentChar.toolColor}`}
                        title="Click to view tool interface & live customer loan dataset"
                      >
                        {agentChar.tool} ↗
                      </button>
                    </div>

                    {/* 8. Storage (Rest) */}
                    <div
                      onClick={() =>
                        onOpenArchitectureModal &&
                        onOpenArchitectureModal({
                          type: 'function_desc',
                          functionKey: 'storageRest',
                          title: '📁 Storage (Rest) Residency',
                          icon: '📁',
                          activeValue: agentChar.storageRest,
                          activeColor: agentChar.storageRestColor,
                        })
                      }
                      className="flex items-start justify-between gap-2 p-1 rounded hover:bg-slate-900/90 cursor-pointer transition text-slate-400 group"
                      title="Click to view Storage at Rest data residency details"
                    >
                      <span className="text-slate-500 shrink-0 group-hover:text-amber-400 flex items-center gap-1">
                        <span>📁</span>
                        <span className="underline decoration-dotted decoration-slate-600 group-hover:decoration-amber-400">
                          Storage (Rest):
                        </span>
                      </span>
                      <span className={`text-right font-sans ${agentChar.storageRestColor}`}>
                        {agentChar.storageRest}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 1. Manual Tier Override'''

html = re.sub(old_arch_block_regex, new_arch_block, html)

# 4. Add ArchitectureInfoModal Component before function App()
modal_component = '''
    function ArchitectureInfoModal({ modalState, onClose, descriptions, datasetSummary, onOpenSettings }) {
      const [searchQuery, setSearchQuery] = useState('');
      if (!modalState) return null;
      const { type, functionKey, title, icon, activeValue, activeColor } = modalState;

      // 1. SMALL FLOATING FUNCTION DESCRIPTION POPUP
      if (type === 'function_desc' && functionKey) {
        const descText = (descriptions && descriptions[functionKey]) || DEFAULT_ARCHITECTURE_DESCRIPTIONS[functionKey];
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
                      <span className="text-purple-400">def</span> <span className="text-emerald-300 font-semibold">calculate_customer_lvr_and_serviceability</span>(<span className="text-amber-300">customer_id</span>: <span className="text-blue-300">str</span>, <span className="text-amber-300">file_path</span>: <span className="text-blue-300">str</span> = <span className="text-emerald-200">"/src/data/customer_loans.csv"</span>) -&gt; <span className="text-blue-300">Dict[str, Any]</span>:
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                      Computes exact Loan-to-Value Ratio (LVR), Lenders Mortgage Insurance (LMI) 80% boundary, Debt-to-Income (DTI), base amortized monthly repayment, and APRA +3.0% rate shock stress buffers with zero LLM hallucination.
                    </p>
                  </div>

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
                        placeholder="Search borrower or ID..."
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
                  </div>

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

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <div className="text-xs font-bold text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
                      <span>📜</span>
                      <span>Core Regulatory Directives &amp; Guardrails</span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-300 font-sans">
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400 font-bold shrink-0">1.</span>
                        <span>
                          <strong className="text-white">APRA CPS 234 Clause 23 (Data Residency):</strong> Customer financial data, income statements, and loan balances must not egress outside Australian jurisdictional boundaries.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400 font-bold shrink-0">2.</span>
                        <span>
                          <strong className="text-white">Deterministic Tool Mandate:</strong> The agent is forbidden from estimating loan calculations via LLM completion. All figures must be computed via <code className="text-emerald-300 font-mono text-[11px]">calculate_customer_lvr</code>.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400 font-bold shrink-0">3.</span>
                        <span>
                          <strong className="text-white">Zero-PII Tokenization:</strong> Sensitive identifiers are replaced with pseudonymized tokens (<code className="text-purple-300 font-mono text-[11px]">[[PII_PERSON_001]]</code>) prior to external model routing.
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
                    <div className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5 font-sans">
                      <span>📐</span>
                      <span>Mathematical Underwriting Rulebook</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">1. Loan-to-Value Ratio (LVR)</div>
                        <div className="text-emerald-300 font-bold">LVR = (Loan Balance / Property Value) × 100</div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          Threshold: If LVR &gt; 80.0%, Lenders Mortgage Insurance (LMI) is mandatory.
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">2. APRA +3.0% Stress Buffer</div>
                        <div className="text-amber-300 font-bold">Stressed Rate = Base Rate + 3.00%</div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          Buffer: (Gross Monthly Income - Expenses - Stressed P&amp;I) must be &ge; $0.00.
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">3. Debt-to-Income (DTI)</div>
                        <div className="text-blue-300 font-bold">DTI = Total Debt / Gross Annual Income</div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          High-Risk Flag: DTI &ge; 6.0x triggers macroprudential credit review.
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">4. Monthly Amortization</div>
                        <div className="text-purple-300 font-bold">M = P × [r(1+r)ⁿ] / [(1+r)ⁿ - 1]</div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          Exact monthly principal and interest payment calculation.
                        </div>
                      </div>
                    </div>
                  </div>

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
    }
'''

if "function ArchitectureInfoModal" not in html:
    html = html.replace("    function App() {", f"{modal_component}\n\n    function App() {{")

# 5. Update SettingsModal in index.html to accept architecture props and render Architecture Info tab
old_settings_sig = '''function SettingsModal({
  isOpen,
  onClose,
  catalog,
  tierSettings,
  onSaveSettings,
  controls,
  onUpdateControls,
  onDatasetUpdate,
}) {'''

new_settings_sig = '''function SettingsModal({
  isOpen,
  onClose,
  catalog,
  tierSettings,
  onSaveSettings,
  controls,
  onUpdateControls,
  onDatasetUpdate,
  architectureDescriptions,
  onSaveArchitectureDescriptions,
  initialTab,
}) {
  const [archDescriptions, setArchDescriptions] = useState(
    architectureDescriptions || DEFAULT_ARCHITECTURE_DESCRIPTIONS
  );
  const [archSavedMsg, setArchSavedMsg] = useState(null);'''

html = html.replace(old_settings_sig, new_settings_sig)

# Sync useEffect in SettingsModal
old_settings_effect = '''  useEffect(() => {
    setLocalSettings(tierSettings);
  }, [tierSettings, isOpen]);'''

new_settings_effect = '''  useEffect(() => {
    setLocalSettings(tierSettings);
    if (architectureDescriptions) {
      setArchDescriptions(architectureDescriptions);
    }
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [tierSettings, architectureDescriptions, isOpen, initialTab]);'''

html = html.replace(old_settings_effect, new_settings_effect)

# Handlers in SettingsModal
old_handle_save = '''  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };'''

new_handle_save = '''  const handleSaveArchitecture = () => {
    if (onSaveArchitectureDescriptions) {
      onSaveArchitectureDescriptions(archDescriptions);
    }
    setArchSavedMsg('Architecture descriptions successfully saved.');
    setTimeout(() => setArchSavedMsg(null), 3000);
  };

  const handleResetArchitectureDefaults = () => {
    setArchDescriptions(DEFAULT_ARCHITECTURE_DESCRIPTIONS);
    if (onSaveArchitectureDescriptions) {
      onSaveArchitectureDescriptions(DEFAULT_ARCHITECTURE_DESCRIPTIONS);
    }
    setArchSavedMsg('Reset all function descriptions to default specifications.');
    setTimeout(() => setArchSavedMsg(null), 3000);
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    if (onSaveArchitectureDescriptions) {
      onSaveArchitectureDescriptions(archDescriptions);
    }
    onClose();
  };'''

html = html.replace(old_handle_save, new_handle_save)

# Tab button in SettingsModal
old_log_tab_btn = '''          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📜</span> Live Enclave Telemetry Logs
          </button>'''

new_log_tab_btn = '''          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📜</span> Live Enclave Telemetry Logs
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'architecture'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🏛️</span> Architecture &amp; Function Info
          </button>'''

html = html.replace(old_log_tab_btn, new_log_tab_btn)

# Tab panel in SettingsModal
old_pii_panel_end = '''              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>Chat View Switching Behavior:</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  When PII Cleanser is <strong>Enabled</strong>, the Chat Window exposes the 3-tier view switcher at the top:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-xs pl-2">
                  <li><strong className="text-blue-400">Clean User View:</strong> Canonical human-readable cleartext preserved in the session vault.</li>
                  <li><strong className="text-purple-400">Sovereign Shield View:</strong> Tokenized representation as seen by the Tier 1 Global LLM with zero PII egress.</li>
                  <li><strong className="text-amber-400">Split / Diff View:</strong> Side-by-side verification and audit comparison.</li>
                </ul>
                <p className="text-slate-500 text-[11px] pt-1">
                  When disabled, the view switcher is hidden and standard direct pass-through is utilized.
                </p>
              </div>
            </div>
          )}'''

arch_panel_content = '''              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>Chat View Switching Behavior:</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  When PII Cleanser is <strong>Enabled</strong>, the Chat Window exposes the 3-tier view switcher at the top:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-xs pl-2">
                  <li><strong className="text-blue-400">Clean User View:</strong> Canonical human-readable cleartext preserved in the session vault.</li>
                  <li><strong className="text-purple-400">Sovereign Shield View:</strong> Tokenized representation as seen by the Tier 1 Global LLM with zero PII egress.</li>
                  <li><strong className="text-amber-400">Split / Diff View:</strong> Side-by-side verification and audit comparison.</li>
                </ul>
                <p className="text-slate-500 text-[11px] pt-1">
                  When disabled, the view switcher is hidden and standard direct pass-through is utilized.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {archSavedMsg && (
                <div className="p-3 rounded-xl flex items-center justify-between text-xs border bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
                  <span className="flex items-center gap-2">
                    <span>✅</span>
                    <span>{archSavedMsg}</span>
                  </span>
                  <button onClick={() => setArchSavedMsg(null)} className="text-slate-400 hover:text-white">
                    ✕
                  </button>
                </div>
              )}

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border text-blue-400 bg-blue-500/10 border-blue-500/30">
                        ARCHITECTURE &amp; INTERACTIVE POPUPS
                      </span>
                      <h3 className="text-sm font-semibold text-white">
                        Sovereign Function Descriptions &amp; Documentation
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                      Customize the descriptions displayed in popups when clicking on function icons in the Active Sovereign Agent architecture card.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleResetArchitectureDefaults}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                    >
                      Reset All Defaults
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveArchitecture}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition"
                    >
                      Save Descriptions
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  'runtime',
                  'modelLocation',
                  'model',
                  'memory',
                  'piiCleanser',
                  'skill',
                  'tool',
                  'storageRest',
                ].map((key) => {
                  const meta = ARCHITECTURE_FUNCTION_METADATA[key];
                  const currentDesc = archDescriptions[key] || DEFAULT_ARCHITECTURE_DESCRIPTIONS[key];
                  const isModified = currentDesc !== DEFAULT_ARCHITECTURE_DESCRIPTIONS[key];

                  return (
                    <div
                      key={key}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{meta.icon}</span>
                          <span className="text-xs font-bold text-white uppercase tracking-wide">
                            {meta.label}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-slate-900 border border-slate-800 text-slate-400">
                            {meta.category}
                          </span>
                        </div>

                        {isModified && (
                          <button
                            type="button"
                            onClick={() =>
                              setArchDescriptions((prev) => ({
                                ...prev,
                                [key]: DEFAULT_ARCHITECTURE_DESCRIPTIONS[key],
                              }))
                            }
                            className="text-[10px] text-amber-400 hover:text-amber-300 underline"
                          >
                            Reset this item
                          </button>
                        )}
                      </div>

                      <textarea
                        rows={2}
                        value={currentDesc}
                        onChange={(e) =>
                          setArchDescriptions((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2.5 focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
                        placeholder={`Enter description for ${meta.label}...`}
                      />

                      <div className="text-[10px] text-slate-500 font-sans flex items-center justify-between">
                        <span>{meta.technicalDoc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResetArchitectureDefaults}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Reset All to Defaults
                </button>
                <button
                  type="button"
                  onClick={handleSaveArchitecture}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition"
                >
                  Save &amp; Apply Descriptions
                </button>
              </div>
            </div>
          )}'''

html = html.replace(old_pii_panel_end, arch_panel_content)

# 6. Update App component in index.html
old_app_start = '''    function App() {
      const [sessionId, setSessionId] = useState(() => {'''

new_app_start = '''    function App() {
      const [sessionId, setSessionId] = useState(() => {'''

# In App state:
old_app_state = '''      const [datasetSummary, setDatasetSummary] = useState(null);'''
new_app_state = '''      const [datasetSummary, setDatasetSummary] = useState(null);
      const [settingsInitialTab, setSettingsInitialTab] = useState(undefined);
      const [architectureDescriptions, setArchitectureDescriptions] = useState(() => {
        try {
          const saved = localStorage.getItem('sovereign_architecture_descriptions');
          if (saved) {
            return { ...DEFAULT_ARCHITECTURE_DESCRIPTIONS, ...JSON.parse(saved) };
          }
        } catch (e) {
          console.error('Failed to parse cached architecture descriptions:', e);
        }
        return DEFAULT_ARCHITECTURE_DESCRIPTIONS;
      });
      const [activeArchitectureModal, setActiveArchitectureModal] = useState(null);'''

html = html.replace(old_app_state, new_app_state)

# In App models fetch:
old_models_fetch = '''            if (data.activeTierSettings) {
              setTierSettings(data.activeTierSettings);
              setControls((prev) => ({ ...prev, tierSettings: data.activeTierSettings }));
            }'''

new_models_fetch = '''            if (data.activeTierSettings) {
              setTierSettings(data.activeTierSettings);
              setControls((prev) => ({ ...prev, tierSettings: data.activeTierSettings }));
            }
            if (data.architectureDescriptions) {
              setArchitectureDescriptions((prev) => ({
                ...prev,
                ...data.architectureDescriptions,
              }));
            }'''

html = html.replace(old_models_fetch, new_models_fetch)

# In App handlers:
old_save_settings_app = '''      const handleSaveSettings = async (updatedSettings) => {
        setTierSettings(updatedSettings);
        setControls((prev) => ({ ...prev, tierSettings: updatedSettings }));

        try {
          await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tierSettings: updatedSettings }),
          });
        } catch (err) {
          console.error('Failed to sync tier settings to backend:', err);
        }
      };'''

new_save_settings_app = '''      const handleSaveSettings = async (updatedSettings) => {
        setTierSettings(updatedSettings);
        setControls((prev) => ({ ...prev, tierSettings: updatedSettings }));

        try {
          await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tierSettings: updatedSettings }),
          });
        } catch (err) {
          console.error('Failed to sync tier settings to backend:', err);
        }
      };

      const handleSaveArchitectureDescriptions = async (updated) => {
        setArchitectureDescriptions(updated);
        try {
          localStorage.setItem('sovereign_architecture_descriptions', JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to cache architecture descriptions:', e);
        }

        try {
          await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ architectureDescriptions: updated }),
          });
        } catch (err) {
          console.error('Failed to sync architecture descriptions to backend:', err);
        }
      };

      const handleOpenSettings = (tab) => {
        setSettingsInitialTab(tab || 'tiers');
        setIsSettingsOpen(true);
      };'''

html = html.replace(old_save_settings_app, new_save_settings_app)

# In App JSX:
old_app_jsx = '''          <div className="flex flex-1 min-h-0 overflow-hidden">
            <ChaosPanel
              controls={controls}
              onChange={(newControls) => setControls({ ...newControls, tierSettings })}
              onResetChat={handleResetChat}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onSelectStage={handleSelectStage}
            />'''

new_app_jsx = '''          <div className="flex flex-1 min-h-0 overflow-hidden">
            <ChaosPanel
              controls={controls}
              onChange={(newControls) => setControls({ ...newControls, tierSettings })}
              onResetChat={handleResetChat}
              onOpenSettings={(tab) => handleOpenSettings(tab)}
              onSelectStage={handleSelectStage}
              onOpenArchitectureModal={setActiveArchitectureModal}
            />'''

html = html.replace(old_app_jsx, new_app_jsx)

# In App SettingsModal & ArchitectureInfoModal JSX:
old_settings_jsx = '''          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            catalog={catalog}
            tierSettings={tierSettings}
            onSaveSettings={handleSaveSettings}
            controls={controls}
            onUpdateControls={(newControls) => setControls(newControls)}
            onDatasetUpdate={(updated) => setDatasetSummary(updated)}
          />'''

new_settings_jsx = '''          <ArchitectureInfoModal
            modalState={activeArchitectureModal}
            onClose={() => setActiveArchitectureModal(null)}
            descriptions={architectureDescriptions}
            datasetSummary={datasetSummary}
            onOpenSettings={(tab) => handleOpenSettings(tab)}
          />

          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            catalog={catalog}
            tierSettings={tierSettings}
            onSaveSettings={handleSaveSettings}
            controls={controls}
            onUpdateControls={(newControls) => setControls(newControls)}
            onDatasetUpdate={(updated) => setDatasetSummary(updated)}
            architectureDescriptions={architectureDescriptions}
            onSaveArchitectureDescriptions={handleSaveArchitectureDescriptions}
            initialTab={settingsInitialTab}
          />'''

html = html.replace(old_settings_jsx, new_settings_jsx)

with open("src/backend/static/index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Successfully updated src/backend/static/index.html with interactive architecture popups and settings!")
