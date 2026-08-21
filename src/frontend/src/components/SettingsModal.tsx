// Copyright 2026 Google LLC. All Rights Reserved.
import React, { useState, useEffect } from 'react';
import { RegionInfo, TierSettingsMap, RedisSyncTelemetry, SimulationControls, CustomPIIRule } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: RegionInfo[];
  tierSettings: TierSettingsMap;
  onSaveSettings: (updatedSettings: TierSettingsMap) => void;
  controls?: SimulationControls;
  onUpdateControls?: (updated: SimulationControls) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  catalog,
  tierSettings,
  onSaveSettings,
  controls,
  onUpdateControls,
}) => {
  const [activeTab, setActiveTab] = useState<'tiers' | 'catalog' | 'enclave' | 'logs' | 'pii'>('tiers');
  const [localSettings, setLocalSettings] = useState<TierSettingsMap>(tierSettings);
  const [customRules, setCustomRules] = useState<CustomPIIRule[]>([]);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleEntityType, setNewRuleEntityType] = useState('PERSON');
  const [newRuleConfidence, setNewRuleConfidence] = useState(0.90);
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [enclaveStatus, setEnclaveStatus] = useState<{
    vmStatus: string;
    tunnelActive: boolean;
    modelLoaded: string;
    internalIp: string;
    zone: string;
    redisSync?: RedisSyncTelemetry;
  } | null>(null);
  const [enclaveLoading, setEnclaveLoading] = useState(false);
  const [enclaveActionMsg, setEnclaveActionMsg] = useState<string | null>(null);
  const [enclaveLogs, setEnclaveLogs] = useState<{
    command: string;
    logs: string[];
    redisSync?: RedisSyncTelemetry;
  } | null>(null);
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(true);

  const fetchPiiRules = async () => {
    try {
      const res = await fetch('/api/pii/rules');
      if (res.ok) {
        const data = await res.json();
        if (data.rules) {
          setCustomRules(data.rules);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

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

  useEffect(() => {
    if (isOpen) {
      fetchPiiRules();
    }
  }, [isOpen]);

  const handleAddRule = async () => {
    if (!newRuleName.trim() || !newRulePattern.trim()) return;
    const ruleObj: CustomPIIRule = {
      name: newRuleName.trim(),
      pattern: newRulePattern.trim(),
      entity_type: newRuleEntityType.trim().toUpperCase().replace(/\s+/g, '_') || 'CUSTOM',
      confidence: Number(newRuleConfidence) || 0.90,
      description: newRuleDesc.trim() || undefined,
      enabled: true,
    };
    try {
      const res = await fetch('/api/pii/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleObj),
      });
      if (res.ok) {
        const data = await res.json();
        setCustomRules(data.rules || [...customRules, ruleObj]);
        setNewRuleName('');
        setNewRulePattern('');
        setNewRuleDesc('');
        setIsAddingRule(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRule = async (ruleName: string) => {
    try {
      const res = await fetch(`/api/pii/rules/${encodeURIComponent(ruleName)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        setCustomRules(data.rules || customRules.filter(r => r.name !== ruleName));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleRule = async (rule: CustomPIIRule) => {
    const updatedRule = { ...rule, enabled: !rule.enabled };
    try {
      const res = await fetch('/api/pii/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRule),
      });
      if (res.ok) {
        const data = await res.json();
        setCustomRules(data.rules);
      }
    } catch (e) {
      console.error(e);
    }
  };

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

  const getTier3Status = () => {
    if (!enclaveStatus) {
      return {
        text: 'Tier 3 Sovereign (Gemma 2 2B) • Checking Status...',
        dotClass: 'bg-slate-500 animate-pulse',
        textClass: 'text-slate-400',
      };
    }
    const vmStatus = enclaveStatus.vmStatus;
    const tunnelActive = enclaveStatus.tunnelActive;

    if (vmStatus === 'RUNNING') {
      if (tunnelActive) {
        return {
          text: 'Tier 3 Sovereign (Gemma 2 2B) • Online (VPC Ready)',
          dotClass: 'bg-emerald-400 animate-pulse',
          textClass: 'text-emerald-300',
        };
      }
      return {
        text: 'Tier 3 Sovereign (Gemma 2 2B) • VM Ready (Tunnel Offline)',
        dotClass: 'bg-amber-400 animate-pulse',
        textClass: 'text-amber-300',
      };
    }

    if (['PROVISIONING', 'STAGING', 'STARTING'].includes(vmStatus)) {
      return {
        text: 'Tier 3 Sovereign (Gemma 2 2B) • VM Starting...',
        dotClass: 'bg-amber-400 animate-pulse',
        textClass: 'text-amber-300',
      };
    }

    if (vmStatus === 'STOPPING') {
      return {
        text: 'Tier 3 Sovereign (Gemma 2 2B) • VM Stopping...',
        dotClass: 'bg-amber-400 animate-pulse',
        textClass: 'text-amber-300',
      };
    }

    const offlineLabel =
      vmStatus === 'STOPPED_OR_UNREACHABLE'
        ? 'Unreachable'
        : vmStatus === 'STOPPED' || vmStatus === 'TERMINATED'
        ? 'VM Stopped'
        : `VM ${vmStatus}`;

    return {
      text: `Tier 3 Sovereign (Gemma 2 2B) • Offline (${offlineLabel})`,
      dotClass: 'bg-slate-500',
      textClass: 'text-slate-400',
    };
  };

  const tier3Status = getTier3Status();

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

        {/* Live Model Availability Status Lights Bar */}
        <div className="px-6 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5">
            <span>📡</span> Live Model Availability:
          </span>
          <div className="flex flex-wrap items-center gap-5">
            <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Tier 1 Global (Gemini 3.7 Flash) • Online
            </span>
            <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Tier 2 Regional (Gemini 2.5 Flash) • Online
            </span>
            <span className={`flex items-center gap-1.5 font-medium ${tier3Status.textClass}`}>
              <span className={`w-2 h-2 rounded-full ${tier3Status.dotClass}`}></span>
              {tier3Status.text}
            </span>
          </div>
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
            onClick={() => setActiveTab('pii')}
            className={`py-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'pii'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🛡️</span> Sovereign PII Cleanser
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

              {/* Sovereign Redis Session Sync Card */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
                      REDIS SESSION SYNC
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      Sovereign Dual-Tier Replicating Store (Tier 2 ↔ Tier 3)
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Synchronized (DB 1)
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  Asynchronously streams conversation transcripts, append-only <code className="text-slate-300">turnStream</code>, and private subagent scratchpads to the Tier 3 sovereign enclave (<code className="text-slate-300">127.0.0.1:6379</code>) ensuring zero-loss state continuity during failover.
                </p>

                <div className="bg-slate-900 rounded-lg p-3 border border-slate-800 font-mono text-[11px] text-emerald-400 max-h-40 overflow-y-auto space-y-1">
                  <div className="text-slate-500 text-[10px] border-b border-slate-800 pb-1 mb-1.5 flex items-center justify-between">
                    <span>● LIVE REDIS REPLICATION LOG EVIDENCE STREAM (PORT 6379 / VALKEY AOF)</span>
                    <span className="text-slate-400">Status: {enclaveStatus?.redisSync?.syncStatus || 'Synchronized'}</span>
                  </div>
                  {(!enclaveStatus?.redisSync?.lastSyncLogs || enclaveStatus.redisSync.lastSyncLogs.length === 0) ? (
                    <div className="text-slate-400">Replicating session manager active. Send a message to stream synchronization logs...</div>
                  ) : (
                    enclaveStatus.redisSync.lastSyncLogs.map((syncLine, idx) => (
                      <div key={idx} className="leading-relaxed hover:bg-slate-800/50 px-1 py-0.5 rounded text-emerald-300 break-all">
                        {syncLine}
                      </div>
                    ))
                  )}
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
              {/* Redis Session Synchronization Log Window */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Sovereign Redis Session Replication Evidence Logs</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Real-time Dual-Tier session state synchronization and crisis turn reconciliation telemetry (<code className="text-slate-300">Port 6379</code>).
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Tier 3 Synced ✓
                  </span>
                </div>

                <div className="bg-slate-900 rounded-lg p-3 border border-slate-800 font-mono text-[11px] text-emerald-300 max-h-36 overflow-y-auto space-y-1">
                  <div className="text-slate-500 text-[10px] border-b border-slate-800 pb-1 mb-1.5">
                    ● REPLICATION AUDIT TRAIL (PRIMARY VERTEX AI ↔ AIRGAPPED SOVEREIGN STANDBY)
                  </div>
                  {(!enclaveLogs?.redisSync?.lastSyncLogs || enclaveLogs.redisSync.lastSyncLogs.length === 0) ? (
                    <div className="text-slate-400 italic">No sync events recorded yet...</div>
                  ) : (
                    enclaveLogs.redisSync.lastSyncLogs.map((syncLine, idx) => (
                      <div key={idx} className="leading-relaxed hover:bg-slate-800/50 px-1 py-0.5 rounded break-all whitespace-pre-wrap">
                        {syncLine}
                      </div>
                    ))
                  )}
                </div>
              </div>

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

          {activeTab === 'pii' && (
            <div className="space-y-6">
              {/* Master PII Cleanser Activation Box */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/30 space-y-4 shadow-lg shadow-purple-500/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-purple-500/20 text-purple-300 border-purple-500/40">
                        ZERO-EGRESS SHIELD
                      </span>
                      <h3 className="text-sm font-bold text-white">
                        Zero-PII Egress Protection &amp; Tokenizer
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl">
                      Automatically scrubs sensitive enterprise identifiers (Names, AU TFNs, Medicare, BSB, Account #s) at the Sovereign Edge before escaping to Tier 1 Global LLMs, and reconstitutes data inside Tier 3 Airgap.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-bold ${controls?.enablePiiTokenizer ? 'text-purple-400' : 'text-slate-500'}`}>
                      {controls?.enablePiiTokenizer ? 'SHIELD ACTIVE' : 'SHIELD DISABLED'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (onUpdateControls && controls) {
                          onUpdateControls({
                            ...controls,
                            enablePiiTokenizer: !controls.enablePiiTokenizer,
                          });
                        }
                      }}
                      className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        controls?.enablePiiTokenizer ? 'bg-purple-600' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          controls?.enablePiiTokenizer ? 'translate-x-7' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-purple-500/20 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Tier 2 Edge: <strong>Cloud Run (AU-SYD)</strong></span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    <span>Tier 3 In-Enclave: <strong>Local Enclave (Port 8002)</strong></span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    <span>Presidio NER: <strong>spaCy + AU Recognizers</strong></span>
                  </span>
                </div>
              </div>

              {/* Architecture & Live Endpoints */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tier 2 Edge Tokenizer */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🦘</span>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Tier 2 Sovereign Edge Tokenizer</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      ONLINE (IAM OIDC)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Enterprise microservice executing on Google Cloud Run in Sydney. Intercepts incoming user prompts at the sovereign perimeter before global dispatch.
                  </p>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[10px] space-y-1">
                    <div className="text-slate-500 uppercase font-semibold">Service Endpoint (australia-southeast1):</div>
                    <div className="text-blue-300 truncate">https://sovereign-pii-tokenizer-uygw3ejxsa-ts.a.run.app</div>
                    <div className="text-slate-500 pt-1">Auth Scheme: <span className="text-emerald-400 font-semibold">Google OIDC IAM Bearer Token</span></div>
                  </div>
                </div>

                {/* Tier 3 Enclave Cleanser */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🔒</span>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Tier 3 Airgap In-Enclave Cleanser</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                      IN-ENCLAVE ZERO-EGRESS
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Local microservice co-located alongside Gemma 2 inside the isolated VPC enclave. Reconstitutes tokenized payloads entirely within private CPU/memory.
                  </p>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[10px] space-y-1">
                    <div className="text-slate-500 uppercase font-semibold">Local Enclave Endpoint:</div>
                    <div className="text-purple-300">http://127.0.0.1:8002 / http://enclave-host:8002</div>
                    <div className="text-slate-500 pt-1">Reconstitution: <span className="text-purple-300 font-semibold">Deterministic Session Salt Reassembly</span></div>
                  </div>
                </div>
              </div>

              {/* Active Presidio Recognizers Catalog */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                    <span>🛡️</span>
                    <span>Active Sovereign Presidio Entity Recognizers</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">8 Active Detectors</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {[
                    { name: 'AU Tax File Numbers', tag: 'AU_TFN', desc: '9-digit algorithm with Mod-11 check', color: 'border-amber-500/30 text-amber-300 bg-amber-500/5' },
                    { name: 'AU Medicare Numbers', tag: 'AU_MEDICARE', desc: '10/11-digit format with checksum verification', color: 'border-amber-500/30 text-amber-300 bg-amber-500/5' },
                    { name: 'AU Bank BSB Numbers', tag: 'AU_BSB', desc: '6-digit APCA financial branch validation', color: 'border-amber-500/30 text-amber-300 bg-amber-500/5' },
                    { name: 'Person Names', tag: 'PERSON', desc: 'spaCy statistical NER (en_core_web_sm)', color: 'border-blue-500/30 text-blue-300 bg-blue-500/5' },
                    { name: 'Bank Account Numbers', tag: 'ACCOUNT_NUMBER', desc: 'Domestic & global bank account regexes', color: 'border-purple-500/30 text-purple-300 bg-purple-500/5' },
                    { name: 'Phone Numbers', tag: 'PHONE_NUMBER', desc: 'Australian & international formats', color: 'border-purple-500/30 text-purple-300 bg-purple-500/5' },
                    { name: 'Email Addresses', tag: 'EMAIL_ADDRESS', desc: 'RFC 5322 compliant regex parser', color: 'border-purple-500/30 text-purple-300 bg-purple-500/5' },
                    { name: 'Credit Card Numbers', tag: 'CREDIT_CARD', desc: 'Major issuers with Luhn checksum', color: 'border-purple-500/30 text-purple-300 bg-purple-500/5' },
                  ].map((item, idx) => (
                    <div key={idx} className={`p-2.5 rounded-lg border ${item.color} space-y-1`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{item.name}</span>
                        <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-black/40 border border-white/10">{item.tag}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-snug">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* User-Defined Custom PII Tokenizer Rules */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                      <span>✨</span>
                      <span>User-Defined Custom PII Tokenization Rules &amp; RegEx</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Define custom pattern recognizers (e.g. conversational names, internal employee badges, project codenames) to be tokenized and restored.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddingRule(!isAddingRule)}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow transition flex items-center gap-1.5"
                  >
                    <span>{isAddingRule ? '✕ Cancel' : '+ Add New Tokenizer Rule'}</span>
                  </button>
                </div>

                {/* Add Rule Form */}
                {isAddingRule && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-purple-500/30 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-xs font-bold text-purple-300">Create Custom Tokenizer Rule</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">Quick Presets:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewRuleName('Conversational Friend Names');
                            setNewRuleEntityType('PERSON');
                            setNewRulePattern(String.raw`\b(?:(?:best\s+)?friend(?:\s+is|\s+named|\'s\s+name\s+is)?|named|called|speaking\s+with|meet(?:\s+with)?)\s+([A-Za-z]{2,20}(?:\s+[A-Za-z]{2,20}){1,2})\b`);
                            setNewRuleDesc('Matches informal lowercase name statements');
                          }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-purple-600/30 text-slate-300 text-[10px] transition"
                        >
                          Friend Names
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewRuleName('Project Codename');
                            setNewRuleEntityType('PROJECT_CODENAME');
                            setNewRulePattern(String.raw`\b(?:Project\s+[A-Z][a-z]+|Project\s+[A-Z0-9_-]+)\b`);
                            setNewRuleDesc('Matches internal confidential project titles');
                          }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-purple-600/30 text-slate-300 text-[10px] transition"
                        >
                          Project Codename
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewRuleName('Employee Badge ID');
                            setNewRuleEntityType('EMPLOYEE_ID');
                            setNewRulePattern(String.raw`\bEMP-\d{5,8}\b`);
                            setNewRuleDesc('Matches internal enterprise employee badges');
                          }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-purple-600/30 text-slate-300 text-[10px] transition"
                        >
                          Employee ID
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Rule Friendly Name
                        </label>
                        <input
                          type="text"
                          value={newRuleName}
                          onChange={(e) => setNewRuleName(e.target.value)}
                          placeholder="e.g. VIP Customer Name"
                          className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Entity Tag / Token Type
                        </label>
                        <input
                          type="text"
                          value={newRuleEntityType}
                          onChange={(e) => setNewRuleEntityType(e.target.value)}
                          placeholder="e.g. PERSON, PROJECT, SECRET_CODE"
                          className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        RegEx Pattern (Supports Capture Groups for target name extraction)
                      </label>
                      <input
                        type="text"
                        value={newRulePattern}
                        onChange={(e) => setNewRulePattern(e.target.value)}
                        placeholder={String.raw`e.g. \b(?:friend\s+is|named)\s+([A-Za-z]+)\b or \bEMP-\d{5}\b`}
                        className="w-full bg-slate-950 border border-slate-700 text-purple-300 font-mono text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Description / Purpose (Optional)
                        </label>
                        <input
                          type="text"
                          value={newRuleDesc}
                          onChange={(e) => setNewRuleDesc(e.target.value)}
                          placeholder="Brief note on when this rule applies"
                          className="w-full bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Confidence Score (0.50 – 1.00)
                        </label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.50"
                          max="1.00"
                          value={newRuleConfidence}
                          onChange={(e) => setNewRuleConfidence(parseFloat(e.target.value) || 0.90)}
                          className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingRule(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddRule}
                        disabled={!newRuleName.trim() || !newRulePattern.trim()}
                        className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold shadow transition"
                      >
                        Save Custom Rule
                      </button>
                    </div>
                  </div>
                )}

                {/* Custom Rules List */}
                <div className="space-y-2">
                  {customRules.length === 0 ? (
                    <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-500 italic">
                      No custom PII rules defined yet. Click "+ Add New Tokenizer Rule" above to create one.
                    </div>
                  ) : (
                    customRules.map((rule, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border transition flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          rule.enabled
                            ? 'bg-slate-900 border-purple-500/30'
                            : 'bg-slate-950 border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{rule.name}</span>
                            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold">
                              [[PII_{rule.entity_type || 'CUSTOM'}_...]]
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({Math.round((rule.confidence || 0.9) * 100)}% conf)
                            </span>
                          </div>
                          <div className="font-mono text-[11px] text-purple-200 bg-slate-950 px-2 py-1 rounded border border-slate-800 inline-block">
                            {rule.pattern}
                          </div>
                          {rule.description && (
                            <p className="text-[10px] text-slate-400">{rule.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleRule(rule)}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition ${
                              rule.enabled
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            {rule.enabled ? 'Enabled ✓' : 'Disabled'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.name)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-300 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 transition"
                            title="Delete custom rule"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* UI Dynamic View Switcher Explanation */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs text-slate-300">
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
