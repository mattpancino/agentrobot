// Copyright 2026 Google LLC. All Rights Reserved.
import React from 'react';
import { SimulationControls, ExecutionMetadata } from '../types';

interface ChaosPanelProps {
  controls: SimulationControls;
  onChange: (updated: SimulationControls) => void;
  metadataList: ExecutionMetadata[];
  onResetChat: () => void;
  onOpenSettings?: () => void;
}

export const ChaosPanel: React.FC<ChaosPanelProps> = ({
  controls,
  onChange,
  metadataList,
  onResetChat,
}) => {
  // Aggregate stats
  const totalTurns = metadataList.length;
  const failoverTurns = metadataList.filter((m) => m.failoverOccurred).length;
  const stickyTurns = metadataList.filter((m) => m.routingMode === 'STICKY_FALLBACK').length;
  const totalSavedMs = metadataList.reduce((acc, m) => acc + (m.wastedLatencyAvoidedMs || 0), 0);

  const handleForcedTierChange = (tier: SimulationControls['forcedTier']) => {
    onChange({
      ...controls,
      forcedTier: tier,
      failedTiers: tier === 'AUTO' ? controls.failedTiers : [],
    });
  };

  const handleToggleFailTier = (tierId: string) => {
    if (controls.forcedTier !== 'AUTO') return;
    const currentFailed = controls.failedTiers || [];
    const isFailed = currentFailed.includes(tierId);
    const updatedFailed = isFailed
      ? currentFailed.filter((id) => id !== tierId)
      : [...currentFailed, tierId];

    onChange({
      ...controls,
      failedTiers: updatedFailed,
    });
  };

  const getEffectiveActiveTier = () => {
    const failed = controls.failedTiers || [];
    const tierOrder: Array<'TIER_1_GLOBAL' | 'TIER_2_REGIONAL' | 'TIER_3_SOVEREIGN'> = [
      'TIER_1_GLOBAL',
      'TIER_2_REGIONAL',
      'TIER_3_SOVEREIGN',
    ];
    const startIndex =
      controls.forcedTier !== 'AUTO'
        ? tierOrder.indexOf(controls.forcedTier)
        : 0;

    for (let i = Math.max(0, startIndex); i < tierOrder.length; i++) {
      if (!failed.includes(tierOrder[i])) {
        return tierOrder[i];
      }
    }
    return 'TIER_3_SOVEREIGN';
  };

  const activeTier = getEffectiveActiveTier();

  const getAgentCharacter = () => {
    let piiCleanserText = 'Disabled (Bypassed)';
    let piiCleanserColor = 'text-slate-500 font-semibold';
    if (controls.enablePiiTokenizer) {
      if (activeTier === 'TIER_3_SOVEREIGN') {
        piiCleanserText = 'Enclave Sidecar (AU-SYD)';
        piiCleanserColor = 'text-emerald-400 font-semibold';
      } else if (activeTier === 'TIER_2_REGIONAL') {
        piiCleanserText = 'Cloud Run (AU-SYD Domestic)';
        piiCleanserColor = 'text-amber-400 font-semibold';
      } else {
        piiCleanserText = 'Cloud Run (AU-SYD Border)';
        piiCleanserColor = 'text-amber-400 font-semibold';
      }
    }

    const skillText = activeTier === 'TIER_3_SOVEREIGN'
      ? 'APRA Enclave Rulebook (Local VPC)'
      : 'APRA Mortgage Underwriter (AU-SYD)';
    const skillColor = activeTier === 'TIER_3_SOVEREIGN'
      ? 'text-emerald-400 font-semibold'
      : 'text-amber-400 font-semibold';

    const toolText = activeTier === 'TIER_3_SOVEREIGN'
      ? 'calculate_customer_lvr (Airgap Enclave)'
      : 'calculate_customer_lvr (Local VM Engine)';
    const toolColor = 'text-emerald-400 font-semibold';

    const storageRestText = activeTier === 'TIER_3_SOVEREIGN'
      ? 'Local Enclave Disk Mirror (/src/data)'
      : 'gs://au-fsi-customer-assets/ (AU-SYD CMEK)';
    const storageRestColor = activeTier === 'TIER_3_SOVEREIGN'
      ? 'text-emerald-400 font-semibold'
      : 'text-amber-400 font-semibold';

    switch (activeTier) {
      case 'TIER_2_REGIONAL':
        return {
          name: 'Regional Agent',
          runtime: 'Vertex AI Agent Engine (AU-SYD)',
          runtimeColor: 'text-amber-400 font-semibold',
          inference: 'In-Country Vertex AI (AU-SYD)',
          inferenceColor: 'text-amber-400 font-semibold',
          memory: 'Vertex AI Managed Sessions (AU-SYD)',
          memoryColor: 'text-amber-400 font-semibold',
          piiCleanser: piiCleanserText,
          piiCleanserColor: piiCleanserColor,
          skill: skillText,
          skillColor: skillColor,
          tool: toolText,
          toolColor: toolColor,
          storageRest: storageRestText,
          storageRestColor: storageRestColor,
          color: 'amber',
          borderClass: 'border-amber-500/40 bg-gradient-to-b from-amber-950/40 to-slate-950',
          glowClass: 'shadow-lg shadow-amber-500/10',
          eyeColor: '#f59e0b',
          pulseClass: 'bg-amber-500',
        };
      case 'TIER_3_SOVEREIGN':
        return {
          name: 'Sovereign Enclave Agent',
          runtime: 'Private Isolated VPC Enclave',
          runtimeColor: 'text-emerald-400 font-semibold',
          inference: 'Self-Hosted Gemma 2 (Local)',
          inferenceColor: 'text-emerald-400 font-semibold',
          memory: 'Tier 3 Local Standby Replica',
          memoryColor: 'text-emerald-400 font-semibold',
          piiCleanser: piiCleanserText,
          piiCleanserColor: piiCleanserColor,
          skill: skillText,
          skillColor: skillColor,
          tool: toolText,
          toolColor: toolColor,
          storageRest: storageRestText,
          storageRestColor: storageRestColor,
          color: 'emerald',
          borderClass: 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/40 to-slate-950',
          glowClass: 'shadow-lg shadow-emerald-500/10',
          eyeColor: '#10b981',
          pulseClass: 'bg-emerald-500',
        };
      case 'TIER_1_GLOBAL':
      default:
        return {
          name: 'Global Frontier Agent',
          runtime: 'Vertex AI Agent Engine (AU-SYD)',
          runtimeColor: 'text-amber-400 font-semibold',
          inference: 'Global Hyperscaler API',
          inferenceColor: 'text-blue-400 font-semibold',
          memory: 'Vertex AI Managed Sessions (AU-SYD)',
          memoryColor: 'text-amber-400 font-semibold',
          piiCleanser: piiCleanserText,
          piiCleanserColor: piiCleanserColor,
          skill: skillText,
          skillColor: skillColor,
          tool: toolText,
          toolColor: toolColor,
          storageRest: storageRestText,
          storageRestColor: storageRestColor,
          color: 'blue',
          borderClass: 'border-blue-500/40 bg-gradient-to-b from-blue-950/40 to-slate-950',
          glowClass: 'shadow-lg shadow-blue-500/10',
          eyeColor: '#3b82f6',
          pulseClass: 'bg-blue-500',
        };
    }
  };

  const agentChar = getAgentCharacter();

  return (
    <aside className="w-[340px] bg-slate-900 border-r border-slate-800 p-5 flex flex-col justify-between shrink-0 h-full overflow-y-auto">
      <div className="space-y-6">
        {/* Active Agent Character & Architecture Card */}
        <div
          className={`p-4 rounded-2xl border ${agentChar.borderClass} ${agentChar.glowClass} transition-all duration-300 space-y-3.5`}
        >
          <div className="flex items-center gap-3">
            {/* SVG Agent Avatar Character */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-center shadow-inner relative overflow-hidden">
                <svg
                  className="w-9 h-9"
                  viewBox="0 0 36 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="5"
                    y="10"
                    width="26"
                    height="20"
                    rx="7"
                    className="fill-slate-800 stroke-slate-600"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M18 10V5"
                    className="stroke-slate-400"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="18"
                    cy="4"
                    r="2.5"
                    fill={agentChar.eyeColor}
                    className="animate-pulse"
                  />
                  <rect
                    x="2"
                    y="16"
                    width="3"
                    height="8"
                    rx="1.5"
                    fill={agentChar.eyeColor}
                    fillOpacity="0.7"
                  />
                  <rect
                    x="31"
                    y="16"
                    width="3"
                    height="8"
                    rx="1.5"
                    fill={agentChar.eyeColor}
                    fillOpacity="0.7"
                  />
                  <circle cx="13" cy="19" r="3" fill={agentChar.eyeColor} />
                  <circle cx="23" cy="19" r="3" fill={agentChar.eyeColor} />
                  <circle cx="14" cy="18" r="1" fill="#ffffff" />
                  <circle cx="24" cy="18" r="1" fill="#ffffff" />
                  <rect
                    x="13"
                    y="24"
                    width="10"
                    height="2.5"
                    rx="1.25"
                    fill={agentChar.eyeColor}
                    fillOpacity="0.85"
                  />
                </svg>
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${agentChar.pulseClass}`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Active Sovereign Agent
              </div>
              <h2 className="text-base font-bold text-white truncate">{agentChar.name}</h2>
            </div>
          </div>

          {/* Integrated Architecture Elements for Active Tier (Color-coded by location) */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-2 text-[11px] font-mono leading-tight">
            <div className="flex items-start justify-between gap-2 text-slate-400">
              <span className="text-slate-500 shrink-0">⚙️ Runtime:</span>
              <span className={`text-right font-sans ${agentChar.runtimeColor}`}>
                {agentChar.runtime}
              </span>
            </div>
            <div className="flex items-start justify-between gap-2 text-slate-400">
              <span className="text-slate-500 shrink-0">⚡ Inference:</span>
              <span className={`text-right font-sans ${agentChar.inferenceColor}`}>
                {agentChar.inference}
              </span>
            </div>
            <div className="flex items-start justify-between gap-2 text-slate-400">
              <span className="text-slate-500 shrink-0">💾 Memory:</span>
              <span className={`text-right font-sans ${agentChar.memoryColor}`}>
                {agentChar.memory}
              </span>
            </div>
            {controls.enablePiiTokenizer && (
              <div className="flex items-start justify-between gap-2 text-slate-400 border-t border-slate-800/60 pt-1.5">
                <span className="text-slate-500 shrink-0">🛡️ PII Cleanser:</span>
                <span className={`text-right font-sans ${agentChar.piiCleanserColor}`}>
                  {agentChar.piiCleanser}
                </span>
              </div>
            )}
            {controls.enterpriseDataEnabled && (
              <>
                <div className="flex items-start justify-between gap-2 text-slate-400 border-t border-slate-800/60 pt-1.5">
                  <span className="text-slate-500 shrink-0">🧠 Skill:</span>
                  <span className={`text-right font-sans ${agentChar.skillColor}`}>
                    {agentChar.skill}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 text-slate-400">
                  <span className="text-slate-500 shrink-0">🔧 Tool:</span>
                  <span className={`text-right font-sans ${agentChar.toolColor}`}>
                    {agentChar.tool}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 text-slate-400">
                  <span className="text-slate-500 shrink-0">📁 Storage (Rest):</span>
                  <span className={`text-right font-sans ${agentChar.storageRestColor}`}>
                    {agentChar.storageRest}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 1. Manual Tier Override & Fail Checkboxes */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
              Manual Sovereignty Override
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Inject Fault</span>
          </div>
          <div className="space-y-2">
            {[
              { id: 'AUTO', label: 'Auto Cascade (Default)', desc: 'Tier 1 -> Tier 2 -> Tier 3' },
              { id: 'TIER_1_GLOBAL', label: 'Lock Tier 1 (Global)', desc: 'Generative AI Global API' },
              { id: 'TIER_2_REGIONAL', label: 'Lock Tier 2 (AU-SYD)', desc: 'Vertex AI Sydney Data Residency' },
              { id: 'TIER_3_SOVEREIGN', label: 'Lock Tier 3 (Airgap VPC)', desc: 'Private VPC Gemma-2 Open Weights' },
            ].map((opt) => (
              <div
                key={opt.id}
                onClick={() => handleForcedTierChange(opt.id as SimulationControls['forcedTier'])}
                className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                  controls.forcedTier === opt.id
                    ? 'bg-blue-600/10 border-blue-500/50 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="forcedTier"
                    checked={controls.forcedTier === opt.id}
                    onChange={() => handleForcedTierChange(opt.id as SimulationControls['forcedTier'])}
                    className="mt-1 accent-blue-500 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-semibold">{opt.label}</div>
                    <div className="text-[10px] text-slate-400">{opt.desc}</div>
                  </div>
                </div>

                {opt.id !== 'AUTO' && (
                  <div
                    className={`flex items-center gap-1.5 ml-2 pl-3 border-l border-slate-800 shrink-0 ${
                      controls.forcedTier !== 'AUTO' ? 'opacity-30 cursor-not-allowed' : ''
                    }`}
                    title={
                      controls.forcedTier !== 'AUTO'
                        ? 'Simulating failure is only enabled in Auto Cascade mode'
                        : 'Inject simulated API fault for this tier'
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      if (controls.forcedTier === 'AUTO') {
                        handleToggleFailTier(opt.id);
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      id={`fail-${opt.id}`}
                      disabled={controls.forcedTier !== 'AUTO'}
                      checked={
                        controls.forcedTier === 'AUTO' &&
                        (controls.failedTiers?.includes(opt.id) || false)
                      }
                      onChange={(e) => {
                        e.stopPropagation();
                        if (controls.forcedTier === 'AUTO') {
                          handleToggleFailTier(opt.id);
                        }
                      }}
                      className={`w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-rose-500 accent-rose-500 ${
                        controls.forcedTier !== 'AUTO' ? 'cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    />
                    <label
                      htmlFor={`fail-${opt.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`text-[11px] font-semibold select-none ${
                        controls.forcedTier !== 'AUTO'
                          ? 'text-slate-500 cursor-not-allowed'
                          : controls.failedTiers?.includes(opt.id)
                          ? 'text-rose-400 cursor-pointer'
                          : 'text-slate-400 hover:text-slate-300 cursor-pointer'
                      }`}
                    >
                      Fail
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 2. System Resilience Telemetry */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
            Live Session Telemetry
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-800">
              <span className="text-slate-400">Total Chat Turns:</span>
              <span className="font-mono text-white font-semibold">{totalTurns}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800">
              <span className="text-slate-400">Failover Transitions:</span>
              <span className="font-mono text-amber-400 font-semibold">{failoverTurns} hops</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800">
              <span className="text-slate-400">Sticky Fallback Turns:</span>
              <span className="font-mono text-blue-400 font-semibold">{stickyTurns}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Timeout Latency Avoided:</span>
              <span className="font-mono text-emerald-400 font-bold">+{totalSavedMs} ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Session Button */}
      <button
        onClick={onResetChat}
        className="w-full mt-4 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition shadow-sm"
      >
        Clear Chat &amp; Reset ADK Session State
      </button>
    </aside>
  );
};

