// Copyright 2026 Google LLC. All Rights Reserved.
import React from 'react';
import { ExecutionMetadata, BuildInfo } from '../types';

interface TelemetryHeaderProps {
  lastMetadata?: ExecutionMetadata;
  buildInfo?: BuildInfo;
  onOpenSettings?: () => void;
  onResetChat?: () => void;
}

export const TelemetryHeader: React.FC<TelemetryHeaderProps> = ({ lastMetadata, buildInfo, onOpenSettings, onResetChat }) => {
  if (!lastMetadata) {
    return (
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
            <span className="font-bold text-sm tracking-tight text-white">Project Sovereign-Stream</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
            ADK 3-Tier Sovereign Cascade
          </span>
          {buildInfo && (
            <>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5" title="Active Git Branch">
                <span className="text-slate-400">Branch:</span>
                <span className="text-emerald-400 font-semibold">{buildInfo.branch}</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5" title="Server Build Timestamp">
                <span className="text-slate-400">Build:</span>
                <span className="text-slate-300">{buildInfo.buildTime}</span>
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400 font-mono hidden sm:inline">
            Ready for executive demonstration • Send a prompt below
          </div>
          {onResetChat && (
            <button
              onClick={onResetChat}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              title="Clear chat transcript and reset session state"
            >
              <span>🔄</span>
              <span>Reset Chat</span>
            </button>
          )}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 border border-blue-400/40 flex items-center gap-1.5 transition whitespace-nowrap"
              title="Open Regional Catalog, Enclave Management, and Live Telemetry Logs"
            >
              <span>⚙️</span>
              <span>Settings &amp; Logs</span>
            </button>
          )}
        </div>
      </header>
    );
  }

  const { activeTier, modelUsed, executionLocation, latencyMs, routingMode, recoverySentinel } = lastMetadata;

  const getTierBadge = () => {
    switch (activeTier) {
      case 'TIER_1_GLOBAL':
        return {
          icon: '🌐',
          label: 'Tier 1 • Global Public',
          color: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
        };
      case 'TIER_2_REGIONAL':
        return {
          icon: '🏛️',
          label: 'Tier 2 • Jurisdictional Subregion',
          color: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        };
      case 'TIER_3_SOVEREIGN':
        return {
          icon: '🔒',
          label: 'Tier 3 • Airgapped VPC',
          color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
        };
    }
  };

  const badge = getTierBadge();

  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 sticky top-0 z-20 shadow-md">
      {/* Left: Active Tier & Model */}
      <div className="flex items-center flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-white tracking-tight">Project Sovereign-Stream</span>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${badge.color}`}>
          <span>{badge.icon}</span>
          <span>{badge.label}</span>
        </span>
        <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
          Model: <span className="text-white font-semibold">{modelUsed}</span>
        </span>
        {buildInfo && (
          <>
            <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700 flex items-center gap-1.5" title="Active Git Branch">
              <span className="text-slate-400">Branch:</span>
              <span className="text-emerald-400 font-semibold">{buildInfo.branch}</span>
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700 hidden sm:flex items-center gap-1.5" title="Server Build Timestamp">
              <span className="text-slate-400">Build:</span>
              <span className="text-slate-300">{buildInfo.buildTime}</span>
            </span>
          </>
        )}
        <span className="text-xs text-slate-400 font-mono hidden xl:inline">
          {executionLocation}
        </span>
      </div>

      {/* Right: Latency, Recovery Sentinel Telemetry & Settings Button */}
      <div className="flex items-center gap-3">
        <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono flex items-center gap-2">
          <span className="text-slate-400">TTFT Latency:</span>
          <span className={`font-bold ${latencyMs < 700 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {latencyMs}ms
          </span>
          {routingMode === 'STICKY_FALLBACK' && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-sans font-semibold">
              Sticky (0ms penalty)
            </span>
          )}
        </div>

        {/* Sentinel Pill */}
        {recoverySentinel && (
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 border ${
              recoverySentinel.status === 'FORCE_FAILED'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                : recoverySentinel.status === 'PROBING_BACKGROUND'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 animate-pulse'
                : recoverySentinel.status === 'PROMOTED_RESTORED'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title={recoverySentinel.message}
          >
            {recoverySentinel.status === 'FORCE_FAILED' && (
              <>
                <span>🚨 Forced Fault:</span>
                <span className="font-mono text-rose-200">
                  {recoverySentinel.failedTiers && recoverySentinel.failedTiers.length > 0
                    ? recoverySentinel.failedTiers
                        .map((t: string) =>
                          t === 'TIER_1_GLOBAL'
                            ? 'Tier 1 (Global)'
                            : t === 'TIER_2_REGIONAL'
                            ? 'Tier 2 (AU-SYD)'
                            : 'Tier 3 (VPC)'
                        )
                        .join(' + ') + ' Failed'
                    : 'Chaos Fault Active'}
                </span>
              </>
            )}
            {recoverySentinel.status === 'PROBING_BACKGROUND' && (
              <>
                <span>🔄 Sentinel Probing:</span>
                <span>{recoverySentinel.consecutiveSuccesses}/{recoverySentinel.requiredSuccesses} Healthy</span>
              </>
            )}
            {recoverySentinel.status === 'PROMOTED_RESTORED' && (
              <>
                <span>✅ Global Restored:</span>
                <span>Auto-Promoted</span>
              </>
            )}
            {recoverySentinel.status === 'IDLE_HEALTHY' && (
              <>
                <span>🟢 Global Healthy</span>
              </>
            )}
            {recoverySentinel.status === 'PROBE_FAILED_HYSTERESIS_RESET' && (
              <>
                <span>⚠️ Sentinel: Probe reset (SLA breach)</span>
              </>
            )}
          </div>
        )}

        {onResetChat && (
          <button
            onClick={onResetChat}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            title="Clear chat transcript and reset session state"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 border border-blue-400/40 flex items-center gap-1.5 transition whitespace-nowrap"
            title="Open Regional Catalog, Enclave Management, and Live Telemetry Logs"
          >
            <span>⚙️</span>
            <span>Settings &amp; Logs</span>
          </button>
        )}
      </div>
    </header>
  );
};
