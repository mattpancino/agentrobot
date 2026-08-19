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
  onOpenSettings,
}) => {
  // Aggregate stats
  const totalTurns = metadataList.length;
  const failoverTurns = metadataList.filter((m) => m.failoverOccurred).length;
  const stickyTurns = metadataList.filter((m) => m.routingMode === 'STICKY_FALLBACK').length;
  const totalSavedMs = metadataList.reduce((acc, m) => acc + (m.wastedLatencyAvoidedMs || 0), 0);

  const handleToggleFailure = () => {
    onChange({
      ...controls,
      injectMockFailure: !controls.injectMockFailure,
    });
  };

  const handleForcedTierChange = (tier: SimulationControls['forcedTier']) => {
    onChange({
      ...controls,
      forcedTier: tier,
    });
  };

  return (
    <aside className="w-80 bg-slate-900 border-r border-slate-800 p-5 flex flex-col justify-between shrink-0 h-[calc(100vh-57px)] overflow-y-auto">
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Chaos Monkey Controls
            </h2>
            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">
              Demo Panel
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Inject mock API faults or override sovereign tier routing to demonstrate zero-state-loss failover live.
          </p>
        </div>

        {/* 1. Regional Models & Tier Settings Button */}
        {onOpenSettings && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Regional Model Catalog</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-semibold">
                Customizable
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              List available models in each region and assign them to cascade tiers.
            </p>
            <button
              onClick={onOpenSettings}
              className="w-full mt-2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 border border-blue-400/40 flex items-center justify-center gap-2 transition"
            >
              <span>⚙️ Settings, Models &amp; VM Logs</span>
            </button>
          </div>
        )}

        {/* 2. Inject Mock Failure Toggle */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">Inject Mock Failure</span>
            <button
              onClick={handleToggleFailure}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                controls.injectMockFailure ? 'bg-rose-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  controls.injectMockFailure ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            {controls.injectMockFailure ? (
              <span className="text-rose-400 font-medium">
                Active: Appending `_broken_test` to active model call. Triggers instant HTTP 404/500 fallback.
              </span>
            ) : (
              <span>Inactive: Standard multi-tier routing without injected faults.</span>
            )}
          </p>
        </div>

        {/* 3. Manual Tier Override Selectors */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
            Manual Sovereignty Override
          </h3>
          <div className="space-y-2">
            {[
              { id: 'AUTO', label: 'Auto Cascade (Default)', desc: 'Tier 1 -> Tier 2 -> Tier 3' },
              { id: 'TIER_1_GLOBAL', label: 'Lock Tier 1 (Global)', desc: 'Generative AI Global API' },
              { id: 'TIER_2_REGIONAL', label: 'Lock Tier 2 (AU-SYD)', desc: 'Vertex AI Sydney Data Residency' },
              { id: 'TIER_3_SOVEREIGN', label: 'Lock Tier 3 (Airgap VPC)', desc: 'Private VPC Gemma-2 Open Weights' },
            ].map((opt) => (
              <label
                key={opt.id}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                  controls.forcedTier === opt.id
                    ? 'bg-blue-600/10 border-blue-500/50 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="forcedTier"
                  checked={controls.forcedTier === opt.id}
                  onChange={() => handleForcedTierChange(opt.id as SimulationControls['forcedTier'])}
                  className="mt-1 accent-blue-500"
                />
                <div>
                  <div className="text-xs font-semibold">{opt.label}</div>
                  <div className="text-[10px] text-slate-400">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 4. System Resilience Telemetry */}
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
