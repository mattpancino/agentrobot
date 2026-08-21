// Copyright 2026 Google LLC. All Rights Reserved.
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ExecutionMetadata } from '../types';

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  enablePiiTokenizer?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isLoading,
  onSendMessage,
  enablePiiTokenizer = true,
}) => {
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'user' | 'shield' | 'diff'>('user');
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const effectiveTab = enablePiiTokenizer ? activeTab : 'user';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, effectiveTab]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  const toggleLog = (id: string) => {
    setExpandedLogs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const highlightTokens = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\[\[PII_[A-Z0-9_]+\]\])/g);
    return parts.map((part, i) => {
      if (part.startsWith('[[PII_') && part.endsWith(']]')) {
        const entType = part.replace(/^\[\[PII_/, '').split('_')[0];
        let colorClass = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
        if (entType.includes('AU') || entType.includes('TFN') || entType.includes('BSB') || entType.includes('MEDICARE')) {
          colorClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
        } else if (entType.includes('PERSON')) {
          colorClass = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
        }
        return (
          <span
            key={i}
            className={`inline-flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5 rounded border font-semibold mx-0.5 ${colorClass}`}
            title={`PII Token: ${part}`}
          >
            <span>🛡️</span>
            <span>{part}</span>
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const renderCollapsibleTelemetry = (msgId: string, meta?: ExecutionMetadata) => {
    if (!meta) return null;
    const isExpanded = !!expandedLogs[msgId];
    const {
      activeTier,
      modelUsed,
      executionLocation,
      sovereigntyClassification,
      routingMode,
      latencyMs,
      wastedLatencyAvoidedMs,
      failoverOccurred,
      failoverHops,
      failoverLog,
      recoverySentinel,
      tier3Synced,
      tier3SyncStatus,
      piiTelemetry,
    } = meta;

    let badgeColor = 'bg-blue-500/10 border-blue-500/30 text-blue-400';
    let icon = '🌐';
    let label = 'Tier 1 Global';

    if (activeTier === 'TIER_2_REGIONAL') {
      badgeColor = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      icon = '🦘';
      label = 'Tier 2 Regional (AU-SYD)';
    } else if (activeTier === 'TIER_3_SOVEREIGN') {
      badgeColor = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      icon = '🔒';
      label = 'Tier 3 Airgap (VPC)';
    }

    return (
      <div className="mt-3 pt-3 border-t border-slate-800/80">
        {/* Accordion Toggle Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${badgeColor}`}>
              <span>{icon}</span>
              <span>{label}</span>
            </span>
            <span className="text-slate-400 font-mono text-[11px]">{modelUsed}</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
              {latencyMs}ms
            </span>

            {piiTelemetry && piiTelemetry.enabled && (
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold text-[11px] flex items-center gap-1 border border-purple-500/40">
                <span>🛡️</span>
                <span>Zero-PII Shield ({piiTelemetry.entitiesIntercepted} Intercepted)</span>
              </span>
            )}

            {wastedLatencyAvoidedMs > 0 && (
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold text-[11px] flex items-center gap-1 border border-emerald-500/30">
                <span>⚡</span>
                <span>+{wastedLatencyAvoidedMs}ms Saved</span>
              </span>
            )}

            {tier3Synced && (
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-semibold text-[11px] flex items-center gap-1 border border-emerald-500/30" title="Session state synchronized with Tier 3 Sovereign Redis store">
                <span>🔄</span>
                <span>Tier 3 Synced</span>
              </span>
            )}

            {failoverOccurred && (
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-semibold text-[11px] border border-rose-500/30">
                ⚠️ Fallback Hop ({failoverHops})
              </span>
            )}
          </div>

          <button
            onClick={() => toggleLog(msgId)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition py-1 px-2 rounded-lg hover:bg-slate-800"
          >
            <span>{isExpanded ? '▼ Hide Routing & Telemetry Log' : '▶ Show Routing & Telemetry Log'}</span>
          </button>
        </div>

        {/* Collapsible Expanded Log Window */}
        {isExpanded && (
          <div className="mt-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-3 transition-all">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                Sovereign-Stream Routing &amp; Telemetry Log
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px]">
                Mode: {routingMode}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1">
                <div className="text-blue-400 font-bold">// Execution Target:</div>
                <div className="text-slate-300">Tier: <span className="text-white font-semibold">{activeTier}</span></div>
                <div className="text-slate-300">Location: <span className="text-white">{executionLocation}</span></div>
                <div className="text-slate-300">Sovereignty: <span className="text-white">{sovereigntyClassification}</span></div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1">
                <div className="text-emerald-400 font-bold">// Performance &amp; Sentinel:</div>
                <div className="text-slate-300">Total Latency: <span className="text-emerald-300 font-bold">{latencyMs}ms</span></div>
                <div className="text-slate-300">Wasted Timeout Avoided: <span className="text-emerald-300 font-bold">+{wastedLatencyAvoidedMs}ms</span></div>
                {recoverySentinel && (
                  <div className="text-slate-300 truncate" title={recoverySentinel.message}>
                    Sentinel: <span className="text-amber-300">{recoverySentinel.status}</span>
                  </div>
                )}
              </div>

              {/* Zero-PII Egress Shield Telemetry Card */}
              {piiTelemetry && piiTelemetry.enabled && (
                <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-800/60 space-y-2 col-span-1 md:col-span-2">
                  <div className="text-purple-300 font-bold flex items-center justify-between">
                    <span>🛡️ Zero-PII Egress Shield Telemetry:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-200 border border-purple-500/40">
                      🔒 Zero-Egress Verified (Scan: {piiTelemetry.scanDurationMs}ms)
                    </span>
                  </div>
                  <div className="text-slate-300 text-xs flex flex-wrap items-center gap-2">
                    <span className="text-slate-400">Intercepted Entities ({piiTelemetry.entitiesIntercepted}):</span>
                    {piiTelemetry.entities.map((ent, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 border border-purple-500/30 text-purple-300 font-mono text-[10px]">
                        {ent.type}: <span className="text-white">{ent.maskedSnippet}</span> → <span className="text-amber-300">{ent.token}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1 col-span-1 md:col-span-2">
                <div className="text-emerald-400 font-bold flex items-center justify-between">
                  <span>// Tier 3 Sovereign Redis Session Sync:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${tier3Synced ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300'}`}>
                    {tier3Synced ? '✔ Synced with Tier 3 Airgap' : '⚠ Sync Pending'}
                  </span>
                </div>
                <div className="text-slate-300">
                  Replication Status: <span className="text-white font-semibold">{tier3SyncStatus || 'Synchronized (Dual-Tier Replicated)'}</span>
                </div>
                <div className="text-slate-400 text-[10px]">
                  Standby Target: <span className="text-purple-300">Redis (127.0.0.1:6379 DB 1)</span> • Ensures zero-loss session continuity across AU-SYD tiers.
                </div>
              </div>
            </div>

            <div>
              <div className="text-amber-400 font-bold mb-1.5">// Failover Hop Sequence:</div>
              <div className="space-y-1.5">
                {failoverLog.map((hop, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-1 border ${
                      hop.status === 'SUCCESS'
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold">Hop {idx + 1}: {hop.tier}</span>
                      <span className="text-slate-400">({hop.attemptedModel})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>{hop.status}</span>
                      <span className="text-slate-400 font-mono">{hop.durationMs}ms</span>
                    </div>
                    {hop.error && (
                      <div className="w-full text-[10px] text-rose-400 font-sans mt-0.5 truncate">
                        Error: {hop.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="flex-1 flex flex-col justify-between bg-slate-950 h-full min-w-0 overflow-hidden">
      {/* Dual Context Inspector Tab Bar - Conditional on Sovereign PII Cleanser */}
      {enablePiiTokenizer && (
        <div className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('user')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                effectiveTab === 'user'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span>💬</span>
              <span>Clean User View</span>
            </button>
            <button
              onClick={() => setActiveTab('shield')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                effectiveTab === 'shield'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span>🛡️</span>
              <span>Sovereign Shield View</span>
            </button>
            <button
              onClick={() => setActiveTab('diff')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                effectiveTab === 'diff'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span>🔀</span>
              <span>Split / Diff View</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-mono hidden md:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Parallel Context Window Synchronized</span>
          </div>
        </div>
      )}

      {/* Transcript Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl text-blue-400">
              🦘
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">
                Project Sovereign-Stream Sales &amp; Exec Demo
              </h3>
              <p className="text-xs text-slate-400">
                Experience seamless 3-tier generative AI failover across Global Gemini, Regional AU-SYD Vertex AI, and Airgapped VPC Gemma with Zero-PII Egress Protection.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full pt-2">
              {[
                "Transfer $500 from John Smith's account 123-456 to Jane Doe.",
                "Customer Sarah Connor with TFN 123 456 782 and Medicare 2123 45670 1 requested balance audit.",
                "What are our primary data governance obligations under APRA CPS 234?",
                "Provide an incident response checklist for cross-border data transfer anomalies.",
                "How do we prove zero PII egress when running sensitive FSI workloads?",
              ].map((sample) => (
                <button
                  key={sample}
                  onClick={() => onSendMessage(sample)}
                  className="p-3 text-left rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition"
                >
                  "{sample}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const tokenizedUserPrompt = msg.metadata?.tokenizedPrompt;
            const tokenizedResp = msg.metadata?.tokenizedResponse;

            let displayContent = msg.content;
            if (effectiveTab === 'shield') {
              if (msg.role === 'user' && tokenizedUserPrompt) {
                displayContent = tokenizedUserPrompt;
              } else if (msg.role === 'assistant' && tokenizedResp) {
                displayContent = tokenizedResp;
              }
            }

            if (effectiveTab === 'diff') {
              return (
                <div key={msg.id} className="w-full space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>{msg.role === 'user' ? '👤 User Turn' : '🤖 Assistant Turn'}</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Left: Clean Cleartext */}
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 space-y-1">
                      <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">
                        💬 Canonical Cleartext (Vault View)
                      </div>
                      <div className="whitespace-pre-wrap font-sans text-sm">{msg.content}</div>
                    </div>
                    {/* Right: Shield Tokenized Context */}
                    <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/50 text-xs text-purple-200 space-y-1">
                      <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wide">
                        🛡️ Model-Facing Context (Zero-Egress View)
                      </div>
                      <div className="whitespace-pre-wrap font-mono text-xs">
                        {highlightTokens(
                          (msg.role === 'user' ? tokenizedUserPrompt : tokenizedResp) || msg.content
                        )}
                      </div>
                    </div>
                  </div>
                  {msg.role === 'assistant' && renderCollapsibleTelemetry(msg.id, msg.metadata)}
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-3xl w-full rounded-2xl p-4 shadow-sm ${
                    msg.role === 'user'
                      ? effectiveTab === 'shield'
                        ? 'bg-purple-900/80 border border-purple-700 text-white rounded-br-none font-mono text-xs'
                        : 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none'
                  }`}
                >
                  <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {effectiveTab === 'shield' ? highlightTokens(displayContent) : displayContent}
                  </div>
                  {msg.role === 'assistant' && renderCollapsibleTelemetry(msg.id, msg.metadata)}
                  <div className="text-[10px] text-slate-400/80 mt-2 text-right">
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex items-start">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Routing request through ADK Sovereign Cascade &amp; Shield...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Type your prompt (e.g. sensitive FSI query with John Smith, account 123-456)..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-semibold rounded-xl transition shadow-sm"
          >
            Send
          </button>
        </div>
      </form>
    </main>
  );
};
