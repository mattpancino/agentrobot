import React, { useState, useRef, useEffect } from 'react';

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
  const [runtimeExpanded, setRuntimeExpanded] = useState(false);
  const [intelligenceExpanded, setIntelligenceExpanded] = useState(false);
  const [showRuntimeModal, setShowRuntimeModal] = useState(false);
  const runtimeModalTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (runtimeModalTimerRef.current) clearTimeout(runtimeModalTimerRef.current);
    };
  }, []);

  const handleToggleRuntimeWithPopup = (nextState: boolean) => {
    if (nextState) {
      setShowRuntimeModal(true);
      if (runtimeModalTimerRef.current) clearTimeout(runtimeModalTimerRef.current);
      runtimeModalTimerRef.current = setTimeout(() => {
        setShowRuntimeModal(false);
      }, 5000);
    } else {
      setShowRuntimeModal(false);
      if (runtimeModalTimerRef.current) clearTimeout(runtimeModalTimerRef.current);
    }
    if (onToggleRuntime) onToggleRuntime(nextState);
  };

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
            Bring the Agent to Life
          </h1>
        </div>

        {/* Dual Industrial Circuit Breakers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Circuit Breaker 1: Execution Runtime */}
          <div
            onClick={() => handleToggleRuntimeWithPopup(!runtimeEnabled)}
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
                  Pillar #1 • Compute & Orchestration
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
            <div className="my-5 p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">Chassis & Sandbox Environment</div>
                <div className="text-[11px] text-slate-400">
                  {runtimeEnabled ? 'Vertex AI Agent Engine • Enclave Online' : 'Click switch to throw breaker'}
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

            {/* What is a Runtime? Collapsible Accordion */}
            <div
              className="border-t border-slate-800/80 pt-3"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setRuntimeExpanded(!runtimeExpanded)}
                className="w-full flex items-center justify-between py-1.5 px-2 -mx-2 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 hover:bg-slate-800/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <span>⚙️</span>
                  <span>What is a Runtime?</span>
                </div>
                <svg
                  className={`w-3.5 h-3.5 transform transition-transform duration-200 ${
                    runtimeExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {runtimeExpanded && (
                <div className="mt-2.5 space-y-3 animate-in fade-in duration-200">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    The sandboxed compute environment that hosts the agent's application code, coordinates multi-turn workflows, and executes deterministic tools.
                  </p>
                  <div className="space-y-2 text-xs font-mono pt-1">
                    <div className={`flex items-start gap-2 ${runtimeEnabled ? 'text-amber-300' : 'text-slate-400'}`}>
                      <span className="shrink-0 mt-0.5">{runtimeEnabled ? '✔' : '○'}</span>
                      <span><strong>Workflow Orchestration:</strong> Manages turn loops, session lifecycles, and tool call routing.</span>
                    </div>
                    <div className={`flex items-start gap-2 ${runtimeEnabled ? 'text-amber-300' : 'text-slate-400'}`}>
                      <span className="shrink-0 mt-0.5">{runtimeEnabled ? '✔' : '○'}</span>
                      <span><strong>Deterministic Tools:</strong> Safely runs mathematical calculations and APIs without hallucination.</span>
                    </div>
                    <div className={`flex items-start gap-2 ${runtimeEnabled ? 'text-amber-300' : 'text-slate-400'}`}>
                      <span className="shrink-0 mt-0.5">{runtimeEnabled ? '✔' : '○'}</span>
                      <span><strong>State & Failover:</strong> Persists session memory and coordinates multi-region recovery paths.</span>
                    </div>
                  </div>
                </div>
              )}
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
                  Pillar #2 • Neural Reasoning
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
            <div className="my-5 p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">Foundation Models & Weights</div>
                <div className="text-[11px] text-slate-400">
                  {intelligenceEnabled ? 'Gemini 3.7/2.5 & Gemma 2 Mounted' : 'Click switch to throw breaker'}
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

            {/* What is Intelligence? Collapsible Accordion */}
            <div
              className="border-t border-slate-800/80 pt-3"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIntelligenceExpanded(!intelligenceExpanded)}
                className="w-full flex items-center justify-between py-1.5 px-2 -mx-2 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 hover:bg-slate-800/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <span>🧠</span>
                  <span>What is Intelligence?</span>
                </div>
                <svg
                  className={`w-3.5 h-3.5 transform transition-transform duration-200 ${
                    intelligenceExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {intelligenceExpanded && (
                <div className="mt-2.5 space-y-3 animate-in fade-in duration-200">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    The neural foundation models and learned parameters providing semantic comprehension, strategic planning, and natural language generation.
                  </p>
                  <div className="space-y-2 text-xs font-mono pt-1">
                    <div className={`flex items-start gap-2 ${intelligenceEnabled ? 'text-blue-300' : 'text-slate-400'}`}>
                      <span className="shrink-0 mt-0.5">{intelligenceEnabled ? '✔' : '○'}</span>
                      <span><strong>Reasoning & Planning:</strong> Interprets complex user intent and formulates step-by-step solutions.</span>
                    </div>
                    <div className={`flex items-start gap-2 ${intelligenceEnabled ? 'text-blue-300' : 'text-slate-400'}`}>
                      <span className="shrink-0 mt-0.5">{intelligenceEnabled ? '✔' : '○'}</span>
                      <span><strong>Multi-Tier Cascade:</strong> Dynamically routes inference across global, regional, and airgapped models.</span>
                    </div>
                    <div className={`flex items-start gap-2 ${intelligenceEnabled ? 'text-blue-300' : 'text-slate-400'}`}>
                      <span className="shrink-0 mt-0.5">{intelligenceEnabled ? '✔' : '○'}</span>
                      <span><strong>Enterprise Policy Adherence:</strong> Enforces organization-specific domain rulebooks and decision logic.</span>
                    </div>
                  </div>
                </div>
              )}
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
                  The execution sandbox is running and cognitive reasoning models are active. You can now advance to Stage 1 to test resilient multi-region failover.
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

      {/* Vertex - Welcome to the Harness Era Modal Popup */}
      {showRuntimeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200"
          onClick={() => {
            if (runtimeModalTimerRef.current) clearTimeout(runtimeModalTimerRef.current);
            setShowRuntimeModal(false);
          }}
        >
          <div
            className="relative max-w-lg w-full bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl p-6 shadow-2xl shadow-amber-500/25 overflow-hidden text-slate-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Animated Progress Countdown Bar (5s) */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300"
                style={{ animation: 'shrink 5s linear forwards' }}
              />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shadow-lg shadow-amber-500/20 shrink-0">
                  ⚙️
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>Vertex AI Agent Engine • Runtime Online</span>
                  </div>
                  <h2 className="text-base md:text-lg font-black text-white tracking-tight mt-0.5">
                    Vertex - Welcome to the Harness Era, Copyright Mitesh 2026
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (runtimeModalTimerRef.current) clearTimeout(runtimeModalTimerRef.current);
                  setShowRuntimeModal(false);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              You have activated the sandboxed sovereign execution runtime. The agent now operates within a stateful compute harness capable of orchestrating multi-turn reasoning, enforcing zero-hallucination tools, and managing high-availability failovers.
            </p>

            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-amber-500/30 text-amber-300 flex flex-col items-center text-center">
                <span className="text-sm mb-1">⚡</span>
                <span className="font-bold">240V Energized</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Compute Enclave</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-amber-500/30 text-amber-300 flex flex-col items-center text-center">
                <span className="text-sm mb-1">🛡️</span>
                <span className="font-bold">Tool Harness</span>
                <span className="text-[9px] text-slate-400 mt-0.5">APRA Deterministic</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-amber-500/30 text-amber-300 flex flex-col items-center text-center">
                <span className="text-sm mb-1">🔄</span>
                <span className="font-bold">Failover Ready</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Multi-Region State</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Auto-dismissing in 5s...
              </span>
              <button
                type="button"
                onClick={() => {
                  if (runtimeModalTimerRef.current) clearTimeout(runtimeModalTimerRef.current);
                  setShowRuntimeModal(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono transition shadow-md shadow-amber-500/20"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
