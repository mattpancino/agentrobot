// Copyright 2026 Google LLC. All Rights Reserved.
// Stage 0: Genesis Lab & Character Assembly Component

import React, { useState } from 'react';

interface StageZeroLabProps {
  runtimeEnabled: boolean;
  intelligenceEnabled: boolean;
  onToggleRuntime: (enabled: boolean) => void;
  onToggleIntelligence: (enabled: boolean) => void;
  onAdvanceToStageOne: () => void;
}

export const StageZeroLab: React.FC<StageZeroLabProps> = ({
  runtimeEnabled = false,
  intelligenceEnabled = false,
  onToggleRuntime,
  onToggleIntelligence,
  onAdvanceToStageOne,
}) => {
  const [directPrompt, setDirectPrompt] = useState('');
  const [promptOutput, setPromptOutput] = useState('');
  const [isSendingPrompt, setIsSendingPrompt] = useState(false);

  const handleTestPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directPrompt.trim() || isSendingPrompt) return;
    setIsSendingPrompt(true);
    setPromptOutput('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'stage0_diagnostic_' + Date.now(),
          message: directPrompt,
          simulationControls: {
            forcedTier: 'TIER_1_GLOBAL',
            enablePiiTokenizer: false,
            enterpriseDataEnabled: false,
            tokenomicsEnabled: false,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPromptOutput(data.content || data.response || 'Diagnostic response completed with 200 OK');
      } else {
        setPromptOutput('Error: HTTP ' + res.status);
      }
    } catch (err: any) {
      setPromptOutput('Connection Error: ' + err.message);
    } finally {
      setIsSendingPrompt(false);
    }
  };

  const isFullyEnergized = runtimeEnabled && intelligenceEnabled;

  return (
    <div className="flex-1 h-full bg-slate-950 flex flex-col overflow-y-auto p-6 md:p-10">
      <div className="max-w-4xl mx-auto w-full space-y-8 my-auto">
        {/* Lab Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>STAGE 0: GENESIS & ASSEMBLY LAB</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white font-sans">
            Bring the Sovereign Agent to Life
          </h1>
          <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Initialize foundational agent sub-systems via physical circuit isolation. Throw the heavy-duty industrial breakers to power the mechanical chassis and synaptically mount cognitive models before proceeding.
          </p>
        </div>

        {/* Dual Industrial Circuit Breakers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Circuit Breaker 1: Execution Runtime */}
          <div
            onClick={() => onToggleRuntime && onToggleRuntime(!runtimeEnabled)}
            className={`rounded-2xl border p-6 transition-all duration-300 cursor-pointer select-none relative overflow-hidden group ${
              runtimeEnabled
                ? 'bg-slate-900/90 border-amber-500/60 shadow-xl shadow-amber-500/10'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 shadow-md'
            }`}
          >
            {/* Top Hazard Trim */}
            <div className="absolute top-0 left-0 right-0 h-1.5 hazard-stripe-muted opacity-80" />

            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  Breaker #1 • Sub-System Power
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5 flex items-center gap-2">
                  <span>⚙️</span> Execution Runtime
                </h3>
              </div>

              {/* Status Pilot LED */}
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    runtimeEnabled
                      ? 'bg-amber-400 shadow-lg shadow-amber-400/80 animate-pulse'
                      : 'bg-rose-500/60'
                  }`}
                />
                <span className={runtimeEnabled ? 'text-amber-300 font-bold' : 'text-slate-500'}>
                  {runtimeEnabled ? '240V ENERGIZED' : '0V STANDBY'}
                </span>
              </div>
            </div>

            {/* Knife-Switch Throw Lever Representation */}
            <div className="my-6 p-5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">Chassis & Hardware Bus</div>
                <div className="text-[11px] text-slate-400">
                  {runtimeEnabled ? 'Power bus online • Optics active' : 'Click switch to throw breaker'}
                </div>
              </div>

              {/* Heavy Throw Switch Widget */}
              <div className="relative flex items-center">
                <div
                  className={`w-16 h-8 rounded-full p-1 transition-colors duration-300 flex items-center border ${
                    runtimeEnabled
                      ? 'bg-amber-500/20 border-amber-500 justify-end'
                      : 'bg-slate-900 border-slate-700 justify-start'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full shadow-md transition-all duration-300 flex items-center justify-center font-bold text-[9px] ${
                      runtimeEnabled
                        ? 'bg-amber-400 text-slate-950 translate-x-0 shadow-amber-400/50'
                        : 'bg-slate-700 text-slate-400 translate-x-0'
                    }`}
                  >
                    {runtimeEnabled ? 'ON' : 'OFF'}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Summary Bullets */}
            <div className="space-y-2 text-xs font-mono border-t border-slate-800/80 pt-4">
              <div className={`flex items-center gap-2 ${runtimeEnabled ? 'text-amber-300 font-semibold' : 'text-slate-500'}`}>
                <span>{runtimeEnabled ? '✔' : '○'}</span>
                <span>Visor eyes boot strobe (blinks) &rarr; steady lit ON</span>
              </div>
              <div className={`flex items-center gap-2 ${runtimeEnabled ? 'text-amber-300 font-semibold' : 'text-slate-500'}`}>
                <span>{runtimeEnabled ? '✔' : '○'}</span>
                <span>Injects ⚙️ Runtime element into Torso body</span>
              </div>
            </div>
          </div>

          {/* Circuit Breaker 2: Cognitive Intelligence */}
          <div
            onClick={() => onToggleIntelligence && onToggleIntelligence(!intelligenceEnabled)}
            className={`rounded-2xl border p-6 transition-all duration-300 cursor-pointer select-none relative overflow-hidden group ${
              intelligenceEnabled
                ? 'bg-slate-900/90 border-blue-500/60 shadow-xl shadow-blue-500/10'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 shadow-md'
            }`}
          >
            {/* Top Hazard Trim */}
            <div className="absolute top-0 left-0 right-0 h-1.5 hazard-stripe-muted opacity-80" />

            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  Breaker #2 • Neural Engine
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5 flex items-center gap-2">
                  <span>🧠</span> Cognitive Intelligence
                </h3>
              </div>

              {/* Status Pilot LED */}
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    intelligenceEnabled
                      ? 'bg-blue-400 shadow-lg shadow-blue-400/80 animate-pulse'
                      : 'bg-rose-500/60'
                  }`}
                />
                <span className={intelligenceEnabled ? 'text-blue-300 font-bold' : 'text-slate-500'}>
                  {intelligenceEnabled ? 'NEURAL SYNAPSED' : 'DISCONNECTED'}
                </span>
              </div>
            </div>

            {/* Knife-Switch Throw Lever Representation */}
            <div className="my-6 p-5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">Foundation Models & Weights</div>
                <div className="text-[11px] text-slate-400">
                  {intelligenceEnabled ? 'Weights mounted • Neural dome glowing' : 'Click switch to throw breaker'}
                </div>
              </div>

              {/* Heavy Throw Switch Widget */}
              <div className="relative flex items-center">
                <div
                  className={`w-16 h-8 rounded-full p-1 transition-colors duration-300 flex items-center border ${
                    intelligenceEnabled
                      ? 'bg-blue-500/20 border-blue-500 justify-end'
                      : 'bg-slate-900 border-slate-700 justify-start'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full shadow-md transition-all duration-300 flex items-center justify-center font-bold text-[9px] ${
                      intelligenceEnabled
                        ? 'bg-blue-400 text-slate-950 translate-x-0 shadow-blue-400/50'
                        : 'bg-slate-700 text-slate-400 translate-x-0'
                    }`}
                  >
                    {intelligenceEnabled ? 'ON' : 'OFF'}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Summary Bullets */}
            <div className="space-y-2 text-xs font-mono border-t border-slate-800/80 pt-4">
              <div className={`flex items-center gap-2 ${intelligenceEnabled ? 'text-blue-300 font-semibold' : 'text-slate-500'}`}>
                <span>{intelligenceEnabled ? '✔' : '○'}</span>
                <span>Illuminates glowing synaptic brain inside Glass Dome</span>
              </div>
              <div className={`flex items-center gap-2 ${intelligenceEnabled ? 'text-blue-300 font-semibold' : 'text-slate-500'}`}>
                <span>{intelligenceEnabled ? '✔' : '○'}</span>
                <span>Injects 📍 Model Location & ⚡ Model into Torso body</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fully Energized Banner & Advance Button */}
        {isFullyEnergized ? (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-blue-950/60 border border-emerald-500/40 shadow-xl space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-400 font-bold text-sm font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>AGENT FULLY ENERGIZED & ASSEMBLED</span>
                </div>
                <p className="text-xs text-slate-300">
                  The robot chassis is powered and cognitive reasoning is active. You can now advance to Stage 1 to test resilient multi-region failover.
                </p>
              </div>

              <button
                type="button"
                onClick={onAdvanceToStageOne}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-blue-500/20 flex items-center gap-2 transition transform hover:scale-105 active:scale-95 shrink-0 font-mono"
              >
                <span>Advance to Stage 1: Resilience</span>
                <span>&rarr;</span>
              </button>
            </div>

            {/* Optional Diagnostic Prompt Box */}
            <div className="pt-3 border-t border-slate-800/80">
              <form onSubmit={handleTestPrompt} className="flex gap-2">
                <input
                  type="text"
                  value={directPrompt}
                  onChange={(e) => setDirectPrompt(e.target.value)}
                  placeholder="Optional: Send raw diagnostic prompt to verify baseline LLM (e.g. 'Hello Agent')..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={isSendingPrompt || !directPrompt.trim()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-mono font-semibold rounded-xl transition"
                >
                  {isSendingPrompt ? 'Sending...' : 'Test Prompt'}
                </button>
              </form>
              {promptOutput && (
                <div className="mt-2.5 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300">
                  <span className="text-slate-500 mr-2">&gt;</span>
                  {promptOutput}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs font-mono text-slate-400 flex items-center justify-center gap-2">
            <span>⚡</span>
            <span>Switch both circuit breakers above to complete Stage 0 assembly</span>
          </div>
        )}
      </div>
    </div>
  );
};
