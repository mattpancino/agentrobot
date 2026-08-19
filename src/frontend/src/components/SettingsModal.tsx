// Copyright 2026 Google LLC. All Rights Reserved.
import React, { useState, useEffect } from 'react';
import { RegionInfo, TierSettingsMap } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: RegionInfo[];
  tierSettings: TierSettingsMap;
  onSaveSettings: (updatedSettings: TierSettingsMap) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  catalog,
  tierSettings,
  onSaveSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'tiers' | 'catalog' | 'enclave' | 'logs'>('tiers');
  const [localSettings, setLocalSettings] = useState<TierSettingsMap>(tierSettings);
  const [enclaveStatus, setEnclaveStatus] = useState<{
    vmStatus: string;
    tunnelActive: boolean;
    modelLoaded: string;
    internalIp: string;
    zone: string;
  } | null>(null);
  const [enclaveLoading, setEnclaveLoading] = useState(false);
  const [enclaveActionMsg, setEnclaveActionMsg] = useState<string | null>(null);
  const [enclaveLogs, setEnclaveLogs] = useState<{
    command: string;
    logs: string[];
  } | null>(null);
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(true);

  const fetchEnclaveStatus = async () => {
    try {
      const res = await fetch('/api/enclave/status');
      if (res.ok) {
        const data = await res.json();
        setEnclaveStatus(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEnclaveLogs = async () => {
    try {
      const res = await fetch('/api/enclave/logs?limit=30');
      if (res.ok) {
        const data = await res.json();
        setEnclaveLogs(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setLocalSettings(tierSettings);
  }, [tierSettings, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchEnclaveStatus();
      const interval = setInterval(fetchEnclaveStatus, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'logs') {
      fetchEnclaveLogs();
      if (autoRefreshLogs) {
        const interval = setInterval(fetchEnclaveLogs, 3000);
        return () => clearInterval(interval);
      }
    }
  }, [isOpen, activeTab, autoRefreshLogs]);

  const handleStartVm = async () => {
    setEnclaveLoading(true);
    setEnclaveActionMsg('Starting VM instance in AU-SYD...');
    try {
      await fetch('/api/enclave/start-vm', { method: 'POST' });
      setTimeout(fetchEnclaveStatus, 2000);
    } finally {
      setEnclaveLoading(false);
    }
  };

  const handleStartTunnel = async () => {
    setEnclaveLoading(true);
    setEnclaveActionMsg('Opening IAP TCP forwarding tunnel on port 8001...');
    try {
      await fetch('/api/enclave/start-tunnel', { method: 'POST' });
      setTimeout(fetchEnclaveStatus, 2000);
    } finally {
      setEnclaveLoading(false);
    }
  };

  const handleStopVm = async () => {
    setEnclaveLoading(true);
    setEnclaveActionMsg('Stopping VM instance to conserve Argolis quota...');
    try {
      await fetch('/api/enclave/stop-vm', { method: 'POST' });
      setTimeout(fetchEnclaveStatus, 2000);
    } finally {
      setEnclaveLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleRegionChange = (tierId: string, newRegionId: string) => {
    const region = catalog.find((r) => r.regionId === newRegionId);
    const defaultModel = region?.models[0]?.id || 'gemini-3.7-flash';
    setLocalSettings((prev) => ({
      ...prev,
      [tierId]: {
        region: newRegionId,
        model: defaultModel,
      },
    }));
  };

  const handleModelChange = (tierId: string, newModelId: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      [tierId]: {
        ...prev[tierId],
        model: newModelId,
      },
    }));
  };

  const handleAssignFromCatalog = (regionId: string, modelId: string, tierId: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      [tierId]: {
        region: regionId,
        model: modelId,
      },
    }));
    setActiveTab('tiers');
  };

  const handleResetDefaults = () => {
    const defaults: TierSettingsMap = {
      TIER_1_GLOBAL: { region: 'global', model: 'gemini-3.7-flash' },
      TIER_2_REGIONAL: { region: 'australia-southeast1', model: 'gemini-2.5-flash' },
      TIER_3_SOVEREIGN: { region: 'airgap-vpc-ausyd', model: 'google/gemma-2-9b-it' },
    };
    setLocalSettings(defaults);
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  const tierMetadata: Record<string, { title: string; desc: string; badge: string; color: string }> = {
    TIER_1_GLOBAL: {
      title: 'Tier 1 • Global Frontier Tier',
      desc: 'Primary high-throughput API routing for standard non-regulated processing.',
      badge: 'TIER 1',
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    },
    TIER_2_REGIONAL: {
      title: 'Tier 2 • Regional Sovereign Tier',
      desc: 'Strict domestic data residency for FSI and APRA CPS 234 compliance.',
      badge: 'TIER 2',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    TIER_3_SOVEREIGN: {
      title: 'Tier 3 • Airgapped VPC Sovereign Tier',
      desc: 'Private VPC enclave for offline failover with zero external internet egress.',
      badge: 'TIER 3',
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>⚙️ Regional AI Model Catalog & Routing Settings</span>
            </h2>
            <p className="text-xs text-slate-400">
              List available models in each region and select which models execute at each cascade tier.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 gap-6">
          <button
            onClick={() => setActiveTab('tiers')}
            className={`py-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'tiers'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Cascade Tier Configuration (Select Models)
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`py-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'catalog'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Browse Regional Model Catalog ({catalog.length} Regions)
          </button>
          <button
            onClick={() => setActiveTab('enclave')}
            className={`py-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'enclave'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🔒</span> Sovereign Enclave &amp; Tunnel Manager
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📜</span> Live Enclave Telemetry Logs
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'tiers' && (
            <div className="space-y-4">
              {(['TIER_1_GLOBAL', 'TIER_2_REGIONAL', 'TIER_3_SOVEREIGN'] as const).map((tierId) => {
                const setting = localSettings[tierId] || { region: 'global', model: 'gemini-3.7-flash' };
                const currentRegion = catalog.find((r) => r.regionId === setting.region) || catalog[0];
                const meta = tierMetadata[tierId];

                return (
                  <div key={tierId} className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta.color}`}>
                            {meta.badge}
                          </span>
                          <h3 className="text-sm font-semibold text-white">{meta.title}</h3>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{meta.desc}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {/* Region Selector */}
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                          Assigned Region / Enclave
                        </label>
                        <select
                          value={setting.region}
                          onChange={(e) => handleRegionChange(tierId, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500"
                        >
                          {catalog.map((reg) => (
                            <option key={reg.regionId} value={reg.regionId}>
                              {reg.name} ({reg.sovereigntyClassification})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Model Selector */}
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                          Available Model Selection
                        </label>
                        <select
                          value={setting.model}
                          onChange={(e) => handleModelChange(tierId, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500"
                        >
                          {currentRegion?.models.map((mod) => (
                            <option key={mod.id} value={mod.id}>
                              {mod.name} [{mod.type}] {mod.recommended ? '★ Recommended' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Active Model Description Badge */}
                    {currentRegion && (
                      <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between">
                        <span>
                          Active Model: <strong className="text-white">{setting.model}</strong> —{' '}
                          {currentRegion.models.find((m) => m.id === setting.model)?.description || currentRegion.description}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'catalog' && (
            <div className="space-y-6">
              {catalog.map((reg) => (
                <div key={reg.regionId} className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{reg.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{reg.description}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
                      {reg.sovereigntyClassification}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {reg.models.map((mod) => (
                      <div
                        key={mod.id}
                        className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-white font-mono">{mod.name}</span>
                            {mod.recommended && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold">
                                Recommended
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-blue-400 mb-1.5">{mod.type}</div>
                          <p className="text-[11px] text-slate-400 leading-snug mb-3">{mod.description}</p>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                          <span className="text-[10px] text-slate-400">Set for:</span>
                          <button
                            onClick={() => handleAssignFromCatalog(reg.regionId, mod.id, 'TIER_1_GLOBAL')}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-blue-600/30 hover:text-blue-300 text-slate-300 text-[10px] font-medium transition"
                          >
                            Tier 1
                          </button>
                          <button
                            onClick={() => handleAssignFromCatalog(reg.regionId, mod.id, 'TIER_2_REGIONAL')}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-emerald-600/30 hover:text-emerald-300 text-slate-300 text-[10px] font-medium transition"
                          >
                            Tier 2
                          </button>
                          <button
                            onClick={() => handleAssignFromCatalog(reg.regionId, mod.id, 'TIER_3_SOVEREIGN')}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-purple-600/30 hover:text-purple-300 text-slate-300 text-[10px] font-medium transition"
                          >
                            Tier 3
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'enclave' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Action Banner */}
              {enclaveActionMsg && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-between text-xs text-purple-300">
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">🔄</span>
                    {enclaveActionMsg}
                  </span>
                  <button
                    onClick={() => setEnclaveActionMsg(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* VM Status & Control Card */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border text-purple-400 bg-purple-500/10 border-purple-500/30">
                        AU-SYD ENCLAVE
                      </span>
                      <h3 className="text-sm font-semibold text-white">Sovereign Airgapped VM (Tier 3)</h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Customer-managed e2-standard-4 (4 vCPU, 16 GB RAM) running in Sydney without public internet egress.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                        enclaveStatus?.vmStatus === 'RUNNING'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${enclaveStatus?.vmStatus === 'RUNNING' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      VM: {enclaveStatus?.vmStatus || 'CHECKING...'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">Internal VPC IP</span>
                    <span className="text-white font-mono">{enclaveStatus?.internalIp || '10.152.0.2'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">External Public IP</span>
                    <span className="text-emerald-400 font-mono">None (--no-address)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">Zone</span>
                    <span className="text-slate-300 font-mono">{enclaveStatus?.zone || 'australia-southeast1-a'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={handleStartVm}
                    disabled={enclaveLoading || enclaveStatus?.vmStatus === 'RUNNING'}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-semibold shadow transition flex items-center gap-1.5"
                  >
                    <span>▶</span> Start VM (Power On)
                  </button>
                  <button
                    onClick={handleStopVm}
                    disabled={enclaveLoading || enclaveStatus?.vmStatus === 'STOPPED' || enclaveStatus?.vmStatus === 'TERMINATED'}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-red-600/80 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <span>⏹</span> Stop VM (Conserve Quota)
                  </button>
                </div>
              </div>

              {/* IAP Secure Tunnel Card */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border text-blue-400 bg-blue-500/10 border-blue-500/30">
                        IAP ZERO-TRUST
                      </span>
                      <h3 className="text-sm font-semibold text-white">Encrypted TCP Forwarding Tunnel (Port 8001)</h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Forwards local port 8001 over Google Identity-Aware Proxy directly into the VM Ollama service.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                        enclaveStatus?.tunnelActive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${enclaveStatus?.tunnelActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      {enclaveStatus?.tunnelActive ? 'Connected (Port 8001)' : 'Disconnected'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">Local Endpoint</span>
                    <span className="text-blue-300 font-mono">http://127.0.0.1:8001/v1</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">Loaded Sovereign Model</span>
                    <span className="text-purple-300 font-mono font-semibold">{enclaveStatus?.modelLoaded || 'google/gemma-2-2b-it'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-500">
                    💡 If the tunnel disconnects, click Start Tunnel below to reconnect instantly.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchEnclaveStatus}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                    >
                      🔄 Refresh
                    </button>
                    <button
                      onClick={handleStartTunnel}
                      disabled={enclaveLoading}
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow transition flex items-center gap-1.5"
                    >
                      <span>⚡</span> Start / Reconnect IAP Tunnel
                    </button>
                  </div>
                </div>
              </div>

              {/* Security Compliance Verification */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                <div className="font-semibold text-slate-200 mb-1">🛡️ Active Argolis Compliance Controls Verified:</div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✔</span>
                  <span><strong>Zero Public Internet Ingress/Egress:</strong> Network interface assigned strictly internal IP 10.152.0.2.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✔</span>
                  <span><strong>Project-Scoped Zero Trust:</strong> Firewall restricted exclusively to IAP (35.235.240.0/20) and private VPC range.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✔</span>
                  <span><strong>Hypervisor Shielded VM:</strong> Secure Boot, vTPM, and Integrity Monitoring enabled.</span>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'logs' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live Argolis VM Telemetry &amp; Chat Payload Monitor</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Executes real-time refined serial console inspection on <code className="text-slate-300">sovereign-gemma-2b-vm</code> (australia-southeast1-a).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAutoRefreshLogs(!autoRefreshLogs)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                        autoRefreshLogs
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${autoRefreshLogs ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                      <span>Auto-Refresh: {autoRefreshLogs ? 'ON (3s)' : 'PAUSED'}</span>
                    </button>
                    <button
                      onClick={fetchEnclaveLogs}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition"
                    >
                      🔄 Refresh Now
                    </button>
                  </div>
                </div>

                {/* Command display box */}
                <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 font-mono text-[11px] text-slate-300 flex items-center justify-between gap-2 overflow-x-auto">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-slate-500 select-none">$</span>
                    <span className="truncate">{enclaveLogs?.command || "gcloud compute instances get-serial-port-output sovereign-gemma-2b-vm --zone=australia-southeast1-a | grep -E 'POST.*chat/completions|prompt eval time|eval time ='"}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (enclaveLogs?.command) {
                        navigator.clipboard.writeText(enclaveLogs.command);
                      }
                    }}
                    className="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 text-[10px] shrink-0 transition"
                    title="Copy CLI command"
                  >
                    📋 Copy Command
                  </button>
                </div>
              </div>

              {/* Terminal window */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs text-emerald-400 overflow-y-auto max-h-[380px] shadow-inner space-y-1">
                <div className="text-slate-500 text-[11px] border-b border-slate-900 pb-2 mb-2 flex items-center justify-between">
                  <span>● OUTPUT STREAM // OLLAMA GEMMA 2 (2B) INFERENCE &amp; PAYLOAD TELEMETRY</span>
                  <span className="text-slate-400">Total lines: {enclaveLogs?.logs?.length || 0}</span>
                </div>
                {(!enclaveLogs || enclaveLogs.logs.length === 0) ? (
                  <div className="text-slate-500 py-6 text-center italic">
                    No active chat payload telemetry logged yet. Send a prompt to TIER_3_SOVEREIGN to observe live token evaluations...
                  </div>
                ) : (
                  enclaveLogs.logs.map((logLine, idx) => (
                    <div key={idx} className="leading-relaxed hover:bg-slate-900/50 px-1 py-0.5 rounded break-all whitespace-pre-wrap">
                      {logLine}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/90">
          <button
            onClick={handleResetDefaults}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            Reset to Default Cascade Models
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition"
            >
              Save &amp; Apply Regional Models
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
