// Copyright 2026 Google LLC. All Rights Reserved.
import React, { useState, useRef, useEffect } from 'react';
import { SimulationControls, ExecutionMetadata, ArchitectureModalState } from '../types';

interface ChaosPanelProps {
  controls: SimulationControls;
  onChange: (updated: SimulationControls) => void;
  metadataList: ExecutionMetadata[];
  onResetChat: () => void;
  onResetDemo?: () => void;
  isResettingDemo?: boolean;
  onOpenSettings?: (tab?: string) => void;
  onSelectStage?: (stage: number) => void;
  onOpenArchitectureModal?: (modalState: ArchitectureModalState) => void;
}

export const ChaosPanel: React.FC<ChaosPanelProps> = ({
  controls,
  onChange,
  metadataList,
  onResetChat,
  onResetDemo,
  isResettingDemo,
  onOpenSettings,
  onSelectStage,
  onOpenArchitectureModal,
}) => {
  // Collapsible panels state (default closed, 5s inactivity auto-close)
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [isStagesOpen, setIsStagesOpen] = useState(false);

  const overrideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stagesTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetOverrideTimer = () => {
    if (overrideTimerRef.current) clearTimeout(overrideTimerRef.current);
    overrideTimerRef.current = setTimeout(() => {
      setIsOverrideOpen(false);
    }, 5000);
  };

  const resetStagesTimer = () => {
    if (stagesTimerRef.current) clearTimeout(stagesTimerRef.current);
    stagesTimerRef.current = setTimeout(() => {
      setIsStagesOpen(false);
    }, 5000);
  };

  const handleToggleOverride = () => {
    setIsOverrideOpen((prev) => {
      const next = !prev;
      if (next) resetOverrideTimer();
      else if (overrideTimerRef.current) clearTimeout(overrideTimerRef.current);
      return next;
    });
  };

  const handleToggleStages = () => {
    setIsStagesOpen((prev) => {
      const next = !prev;
      if (next) resetStagesTimer();
      else if (stagesTimerRef.current) clearTimeout(stagesTimerRef.current);
      return next;
    });
  };

  useEffect(() => {
    return () => {
      if (overrideTimerRef.current) clearTimeout(overrideTimerRef.current);
      if (stagesTimerRef.current) clearTimeout(stagesTimerRef.current);
    };
  }, []);
  // Aggregate stats
  const totalTurns = metadataList.length;
  const failoverTurns = metadataList.filter((m) => m.failoverOccurred).length;
  const stickyTurns = metadataList.filter((m) => m.routingMode === 'STICKY_FALLBACK').length;
  const totalSavedMs = metadataList.reduce((acc, m) => acc + (m.wastedLatencyAvoidedMs || 0), 0);

  const currentStage =
    controls.enablePiiTokenizer && controls.enterpriseDataEnabled && controls.tokenomicsEnabled
      ? 4
      : controls.enablePiiTokenizer && controls.enterpriseDataEnabled && !controls.tokenomicsEnabled
      ? 3
      : controls.enablePiiTokenizer && !controls.enterpriseDataEnabled && !controls.tokenomicsEnabled
      ? 2
      : !controls.enablePiiTokenizer && !controls.enterpriseDataEnabled && !controls.tokenomicsEnabled
      ? 1
      : 0;

  const handleStageSelect = (stage: number) => {
    if (onSelectStage) {
      onSelectStage(stage);
    } else {
      if (stage === 1) {
        onChange({ ...controls, enablePiiTokenizer: false, enterpriseDataEnabled: false, tokenomicsEnabled: false, forcedTier: 'AUTO', failedTiers: [] });
      } else if (stage === 2) {
        onChange({ ...controls, enablePiiTokenizer: true, enterpriseDataEnabled: false, tokenomicsEnabled: false, forcedTier: 'AUTO', failedTiers: [] });
      } else if (stage === 3) {
        onChange({ ...controls, enablePiiTokenizer: true, enterpriseDataEnabled: true, tokenomicsEnabled: false, forcedTier: 'AUTO', failedTiers: [] });
      } else if (stage === 4) {
        onChange({ ...controls, enablePiiTokenizer: true, enterpriseDataEnabled: true, tokenomicsEnabled: true, forcedTier: 'AUTO', failedTiers: [] });
      }
      onResetChat();
    }
  };

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
    let piiCleanserColor = 'text-slate-500 font-normal';
    if (controls.enablePiiTokenizer) {
      if (activeTier === 'TIER_3_SOVEREIGN') {
        piiCleanserText = 'Local Sidecar (On-Prem)';
        piiCleanserColor = 'text-emerald-400 font-semibold';
      } else if (activeTier === 'TIER_2_REGIONAL') {
        piiCleanserText = 'Cloud Run (AU-SYD Domestic)';
        piiCleanserColor = 'text-amber-400 font-semibold';
      } else {
        piiCleanserText = 'Cloud Run (AU-SYD Border)';
        piiCleanserColor = 'text-amber-400 font-semibold';
      }
    }

    let skillText = 'Standard Base Agent (No Domain Rules)';
    let skillColor = 'text-slate-500 font-normal';
    if (controls.enterpriseDataEnabled) {
      skillText = activeTier === 'TIER_3_SOVEREIGN'
        ? 'Baked Enclave: APRA Rulebook (Cord-Cut Ready ✓)'
        : 'Cloud Registry: APRA Underwriter (AU-SYD CMEK)';
      skillColor = activeTier === 'TIER_3_SOVEREIGN'
        ? 'text-purple-300 font-semibold'
        : 'text-amber-400 font-semibold';
    }

    let toolText = 'Disabled (Standard LLM Only)';
    let toolColor = 'text-slate-500 font-normal';
    if (controls.enterpriseDataEnabled) {
      toolText = activeTier === 'TIER_3_SOVEREIGN'
        ? 'calculate_customer_lvr (On-Prem)'
        : 'calculate_customer_lvr (Local VM Engine)';
      toolColor = 'text-emerald-400 font-semibold';
    }

    let storageRestText = activeTier === 'TIER_3_SOVEREIGN'
      ? 'Local Redis Replica (On-Prem)'
      : 'Vertex AI Managed Sessions (AU-SYD)';
    let storageRestColor = 'text-slate-400 font-normal';
    if (controls.enterpriseDataEnabled) {
      storageRestText = activeTier === 'TIER_3_SOVEREIGN'
        ? 'Local Disk Mirror (/src/data) (On-Prem)'
        : 'gs://au-fsi-customer-assets/ (AU-SYD CMEK)';
      storageRestColor = activeTier === 'TIER_3_SOVEREIGN'
        ? 'text-emerald-400 font-semibold'
        : 'text-amber-400 font-semibold';
    }

    let inTokensCount = 0;
    let outTokensCount = 0;
    if (metadataList && metadataList.length > 0) {
      metadataList.forEach((m) => {
        if (m.inputTokens) {
          inTokensCount += m.inputTokens;
        }
        if (m.outputTokens) {
          outTokensCount += m.outputTokens;
        }
      });
    }
    if (inTokensCount === 0 && outTokensCount === 0) {
      inTokensCount = 1240;
      outTokensCount = 320;
    }

    const tokensUsedFormatted = `${inTokensCount.toLocaleString()} In / ${outTokensCount.toLocaleString()} Out`;

    const getModelPricingRates = (modelId?: string) => {
      if (!modelId) return { inRate: 0.10, outRate: 0.40, isSelfHosted: false };
      const mid = modelId.toLowerCase();
      if (mid.includes('gemma') || mid.includes('airgap')) {
        return { inRate: 0.0, outRate: 0.0, isSelfHosted: true };
      }
      if (mid.includes('claude') || mid.includes('sonnet')) {
        return { inRate: 3.00, outRate: 15.00, isSelfHosted: false };
      }
      if (mid.includes('pro')) {
        return { inRate: 1.25, outRate: 5.00, isSelfHosted: false };
      }
      if (mid.includes('flash-002') || mid.includes('flash-001')) {
        return { inRate: 0.075, outRate: 0.30, isSelfHosted: false };
      }
      return { inRate: 0.10, outRate: 0.40, isSelfHosted: false };
    };

    const activeModelIdentifier = controls.tierSettings?.[activeTier]?.model || (
      activeTier === 'TIER_1_GLOBAL' ? 'gemini-3.7-flash' : activeTier === 'TIER_2_REGIONAL' ? 'gemini-2.5-flash' : 'google/gemma-2-2b-it'
    );
    const rates = getModelPricingRates(activeModelIdentifier);

    let modelRateFormatted = '';
    if (rates.isSelfHosted || activeTier === 'TIER_3_SOVEREIGN') {
      modelRateFormatted = '$0.00 / 1M (Self-Hosted)';
    } else {
      modelRateFormatted = `$${rates.inRate.toFixed(2)} in / $${rates.outRate.toFixed(2)} out (1M)`;
    }

    let costPer10kFormatted = '';
    if (rates.isSelfHosted || activeTier === 'TIER_3_SOVEREIGN') {
      costPer10kFormatted = '$0.00 (Self-Hosted · 0 API Fee)';
    } else {
      const inCostTotal = (inTokensCount * rates.inRate) / 100.0;
      const outCostTotal = (outTokensCount * rates.outRate) / 100.0;
      const totalCost = inCostTotal + outCostTotal;
      costPer10kFormatted = `$${totalCost.toFixed(2)} / 10k Turns`;
    }

    const getModelDisplayName = (tier: string) => {
      const configuredModel = controls.tierSettings?.[tier]?.model;
      if (configuredModel) {
        if (configuredModel === 'gemini-3.7-flash') return 'Gemini 3.7 Flash';
        if (configuredModel === 'gemini-2.5-flash') return 'Gemini 2.5 Flash';
        if (configuredModel === 'gemini-1.5-pro-002') return 'Gemini 1.5 Pro (002)';
        if (configuredModel === 'gemini-1.5-flash-002') return 'Gemini 1.5 Flash (002)';
        if (configuredModel === 'gemini-2.0-flash-001') return 'Gemini 2.0 Flash (001)';
        if (configuredModel === 'gemini-2.0-pro-exp-02-05') return 'Gemini 2.0 Pro Experimental';
        if (configuredModel === 'gemini-1.0-pro-002') return 'Gemini 1.0 Pro (002)';
        if (configuredModel === 'gemini-1.5-flash-001') return 'Gemini 1.5 Flash (001)';
        if (configuredModel.includes('gemma')) return 'Gemma 2 (Self-Hosted)';
        return configuredModel;
      }
      if (tier === 'TIER_1_GLOBAL') return 'Gemini 3.7 Flash';
      if (tier === 'TIER_2_REGIONAL') return 'Gemini 2.5 Flash';
      return 'Gemma 2 (Self-Hosted)';
    };

    switch (activeTier) {
      case 'TIER_2_REGIONAL':
        return {
          name: 'Regional Agent',
          runtime: 'Vertex AI Agent Engine (AU-SYD)',
          runtimeColor: 'text-amber-400 font-semibold',
          modelLocation: 'Sydney (AU-SYD)',
          modelLocationColor: 'text-amber-400 font-semibold',
          model: getModelDisplayName('TIER_2_REGIONAL'),
          modelColor: 'text-amber-400 font-semibold',
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
          tokensUsed: tokensUsedFormatted,
          tokensUsedColor: 'text-slate-100 font-medium font-mono',
          modelRate: modelRateFormatted,
          modelRateColor: 'text-slate-100 font-medium font-mono',
          costPer10kTurns: costPer10kFormatted,
          costPer10kTurnsColor: 'text-slate-100 font-medium font-mono',
          costPer1000Turns: costPer10kFormatted,
          costPer1000TurnsColor: 'text-slate-100 font-medium font-mono',
          color: 'amber',
          borderClass: 'border-amber-500/40 bg-gradient-to-b from-amber-950/40 to-slate-950',
          glowClass: 'shadow-lg shadow-amber-500/10',
          eyeColor: '#f59e0b',
          pulseClass: 'bg-amber-500',
        };
      case 'TIER_3_SOVEREIGN':
        return {
          name: 'On-Prem Agent',
          runtime: 'Private Isolated VPC (On-Prem)',
          runtimeColor: 'text-emerald-400 font-semibold',
          modelLocation: 'Airgapped (On-Prem)',
          modelLocationColor: 'text-emerald-400 font-semibold',
          model: getModelDisplayName('TIER_3_SOVEREIGN'),
          modelColor: 'text-emerald-400 font-semibold',
          memory: 'Local Standby Replica (On-Prem)',
          memoryColor: 'text-emerald-400 font-semibold',
          piiCleanser: piiCleanserText,
          piiCleanserColor: piiCleanserColor,
          skill: skillText,
          skillColor: skillColor,
          tool: toolText,
          toolColor: toolColor,
          storageRest: storageRestText,
          storageRestColor: storageRestColor,
          tokensUsed: tokensUsedFormatted,
          tokensUsedColor: 'text-slate-100 font-medium font-mono',
          modelRate: modelRateFormatted,
          modelRateColor: 'text-slate-100 font-medium font-mono',
          costPer10kTurns: costPer10kFormatted,
          costPer10kTurnsColor: 'text-slate-100 font-medium font-mono',
          costPer1000Turns: costPer10kFormatted,
          costPer1000TurnsColor: 'text-slate-100 font-medium font-mono',
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
          modelLocation: 'Global Multi-Region',
          modelLocationColor: 'text-blue-400 font-semibold',
          model: getModelDisplayName('TIER_1_GLOBAL'),
          modelColor: 'text-blue-400 font-semibold',
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
          tokensUsed: tokensUsedFormatted,
          tokensUsedColor: 'text-slate-100 font-medium font-mono',
          modelRate: modelRateFormatted,
          modelRateColor: 'text-slate-100 font-medium font-mono',
          costPer10kTurns: costPer10kFormatted,
          costPer10kTurnsColor: 'text-slate-100 font-medium font-mono',
          costPer1000Turns: costPer10kFormatted,
          costPer1000TurnsColor: 'text-slate-100 font-medium font-mono',
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

          {/* Integrated Architecture Elements for Active Tier (Interactive Popups) */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-1.5 text-[11px] font-mono leading-tight">
            {/* 1. Runtime */}
            <div
              onClick={() =>
                onOpenArchitectureModal?.({
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
                onOpenArchitectureModal?.({
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
                onOpenArchitectureModal?.({
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
                onOpenArchitectureModal?.({
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
                  onOpenArchitectureModal?.({
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
                      onOpenArchitectureModal?.({
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
                      onOpenArchitectureModal?.({
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
                      onOpenArchitectureModal?.({
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
                      onOpenArchitectureModal?.({
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
                    onOpenArchitectureModal?.({
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

            {/* 9. Tokens, 10. Model Cost, 11. 10k Projections (Stage 4: Tokenomics) */}
            {controls.tokenomicsEnabled && (
              <>
                {/* 9. Tokens (In/Out) */}
                <div
                  onClick={() =>
                    onOpenArchitectureModal?.({
                      type: 'function_desc',
                      functionKey: 'tokensUsed',
                      title: '📊 Token Usage (In / Out)',
                      icon: '📊',
                      activeValue: agentChar.tokensUsed,
                      activeColor: agentChar.tokensUsedColor,
                    })
                  }
                  className="flex items-start justify-between gap-2 p-1 rounded hover:bg-slate-900/90 cursor-pointer transition text-slate-400 group border-t border-slate-800/60 pt-1.5"
                  title="Click to view Context Window & Token Generation metrics"
                >
                  <span className="text-slate-500 shrink-0 group-hover:text-blue-400 flex items-center gap-1">
                    <span>📊</span>
                    <span className="underline decoration-dotted decoration-slate-600 group-hover:decoration-blue-400">
                      Tokens (In/Out):
                    </span>
                  </span>
                  <span className={`text-right font-sans ${agentChar.tokensUsedColor}`}>
                    {agentChar.tokensUsed}
                  </span>
                </div>

                {/* 10. Actual Model Cost per 1M Tokens (USD) */}
                <div
                  onClick={() =>
                    onOpenArchitectureModal?.({
                      type: 'function_desc',
                      functionKey: 'modelCostPerMillion',
                      title: '🏷️ Actual Model Cost (USD / 1M Tokens)',
                      icon: '🏷️',
                      activeValue: agentChar.modelRate,
                      activeColor: agentChar.modelRateColor,
                    })
                  }
                  className="flex items-start justify-between gap-2 p-1 rounded hover:bg-slate-900/90 cursor-pointer transition text-slate-400 group"
                  title="Click to view published Vertex AI model pricing rate card in USD per 1M tokens"
                >
                  <span className="text-slate-500 shrink-0 group-hover:text-amber-400 flex items-center gap-1">
                    <span>🏷️</span>
                    <span className="underline decoration-dotted decoration-slate-600 group-hover:decoration-amber-400">
                      Model Cost (/1M):
                    </span>
                  </span>
                  <span className={`text-right font-sans ${agentChar.modelRateColor}`}>
                    {agentChar.modelRate}
                  </span>
                </div>

                {/* 11. Cost per 10,000 Turns */}
                <div
                  onClick={() =>
                    onOpenArchitectureModal?.({
                      type: 'function_desc',
                      functionKey: 'costPer10kTurns',
                      title: '💰 Projected Cost (x10,000 Turns)',
                      icon: '💰',
                      activeValue: agentChar.costPer10kTurns,
                      activeColor: agentChar.costPer10kTurnsColor,
                    })
                  }
                  className="flex items-start justify-between gap-2 p-1 rounded hover:bg-slate-900/90 cursor-pointer transition text-slate-400 group"
                  title="Click to view 10,000-turn economic cost modeling across model tiers"
                >
                  <span className="text-slate-500 shrink-0 group-hover:text-emerald-400 flex items-center gap-1">
                    <span>💰</span>
                    <span className="underline decoration-dotted decoration-slate-600 group-hover:decoration-emerald-400">
                      Cost / x10k Turns:
                    </span>
                  </span>
                  <span className={`text-right font-sans ${agentChar.costPer10kTurnsColor}`}>
                    {agentChar.costPer10kTurns}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 1. Manual Tier Override & Fail Checkboxes (Collapsible, 5s Auto-Close) */}
        <div
          onMouseMove={() => isOverrideOpen && resetOverrideTimer()}
          onClick={() => isOverrideOpen && resetOverrideTimer()}
          className="rounded-xl bg-slate-950 border border-slate-800 transition-all duration-200 overflow-hidden"
        >
          {/* Collapsible Header */}
          <div
            onClick={handleToggleOverride}
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-900/60 transition select-none group"
            title={isOverrideOpen ? "Click to collapse panel" : "Click to expand manual sovereignty controls"}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-slate-400 group-hover:text-blue-400 transition text-xs">🎛️</span>
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wide truncate">
                Manual Sovereignty Override
              </h3>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {/* Collapsed Status Summary Badge */}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border ${
                controls.forcedTier === 'AUTO'
                  ? (controls.failedTiers && controls.failedTiers.length > 0
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-300')
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              }`}>
                {controls.forcedTier === 'AUTO'
                  ? (controls.failedTiers && controls.failedTiers.length > 0
                      ? `Auto (${controls.failedTiers.length} Fault${controls.failedTiers.length > 1 ? 's' : ''})`
                      : 'Auto Cascade')
                  : controls.forcedTier === 'TIER_1_GLOBAL'
                  ? 'Tier 1 Locked'
                  : controls.forcedTier === 'TIER_2_REGIONAL'
                  ? 'Tier 2 Locked'
                  : 'Tier 3 Locked'}
              </span>

              {/* Chevron */}
              <svg
                className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform duration-200 ${
                  isOverrideOpen ? 'rotate-180 text-blue-400' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Expanded Content Body */}
          {isOverrideOpen && (
            <div className="p-3 pt-0 border-t border-slate-800/80 space-y-3 mt-1">
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-slate-400">Select active tier or inject simulated faults:</span>
                <span className="text-[10px] text-slate-500 font-mono">Inject Fault</span>
              </div>
              <div className="space-y-2">
                {[
                  { id: 'AUTO', label: 'Auto Cascade (Default)', desc: 'Tier 1 -> Tier 2 -> Tier 3' },
                  { id: 'TIER_1_GLOBAL', label: 'Lock Tier 1 (Global)', desc: 'Generative AI Global API' },
                  { id: 'TIER_2_REGIONAL', label: 'Lock Tier 2 (AU-SYD)', desc: 'Vertex AI Sydney Data Residency' },
                  { id: 'TIER_3_SOVEREIGN', label: 'Lock Tier 3 (On-Prem)', desc: 'Private On-Prem Gemma-2 Open Weights' },
                ].map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => {
                      handleForcedTierChange(opt.id as SimulationControls['forcedTier']);
                      resetOverrideTimer();
                    }}
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
                        onChange={() => {
                          handleForcedTierChange(opt.id as SimulationControls['forcedTier']);
                          resetOverrideTimer();
                        }}
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
                            resetOverrideTimer();
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
                              resetOverrideTimer();
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
          )}
        </div>

        {/* Demo Presentation Stages (Collapsible, 5s Auto-Close) */}
        <div
          onMouseMove={() => isStagesOpen && resetStagesTimer()}
          onClick={() => isStagesOpen && resetStagesTimer()}
          className="rounded-xl bg-slate-950 border border-indigo-500/30 shadow-lg shadow-indigo-950/20 transition-all duration-200 overflow-hidden"
        >
          {/* Collapsible Header */}
          <div
            onClick={handleToggleStages}
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-indigo-950/20 transition select-none group"
            title={isStagesOpen ? "Click to collapse stages panel" : "Click to expand demo stages"}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0"></span>
              <h3 className="text-xs font-semibold text-indigo-200 uppercase tracking-wide truncate">
                Demo Presentation Stages
              </h3>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Collapsed Stage Status Pill */}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border ${
                currentStage === 1
                  ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                  : currentStage === 2
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                  : currentStage === 3
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : currentStage === 4
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}>
                {currentStage === 1
                  ? 'Stage 1: Core Memory'
                  : currentStage === 2
                  ? 'Stage 2: Zero-PII'
                  : currentStage === 3
                  ? 'Stage 3: Enterprise LVR'
                  : currentStage === 4
                  ? 'Stage 4: Tokenomics'
                  : 'Custom Mode'}
              </span>

              {/* Chevron */}
              <svg
                className={`w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-200 transition-transform duration-200 ${
                  isStagesOpen ? 'rotate-180 text-indigo-300' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Expanded Content Body */}
          {isStagesOpen && (
            <div className="p-3 pt-0 border-t border-indigo-950/60 space-y-2.5 mt-1">
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-slate-400">1-Click demo scenario presets:</span>
                <span className="text-[10px] text-indigo-400 font-mono">1-Click Presets</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    handleStageSelect(1);
                    resetStagesTimer();
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                    currentStage === 1
                      ? 'bg-blue-600/25 border-blue-500 text-blue-200 shadow-md shadow-blue-900/30 ring-1 ring-blue-500/40 font-bold'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Stage 1: Core Memory & Failover (PII Off, Tools Off, Econ Off)"
                >
                  <span className="text-xs font-bold text-blue-400">Stage 1</span>
                  <span className="text-[10px] font-semibold mt-0.5 leading-tight">Core Memory</span>
                  <span className="text-[8px] opacity-70 mt-0.5">PII: Off • Tools: Off</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleStageSelect(2);
                    resetStagesTimer();
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                    currentStage === 2
                      ? 'bg-purple-600/25 border-purple-500 text-purple-200 shadow-md shadow-purple-900/30 ring-1 ring-purple-500/40 font-bold'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Stage 2: Zero-PII Cryptographic Token Shield (PII On, Tools Off, Econ Off)"
                >
                  <span className="text-xs font-bold text-purple-400">Stage 2</span>
                  <span className="text-[10px] font-semibold mt-0.5 leading-tight">Zero-PII</span>
                  <span className="text-[8px] opacity-70 mt-0.5">PII: On • Tools: Off</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleStageSelect(3);
                    resetStagesTimer();
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                    currentStage === 3
                      ? 'bg-amber-600/25 border-amber-500 text-amber-200 shadow-md shadow-amber-900/30 ring-1 ring-amber-500/40 font-bold'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Stage 3: Enterprise APRA CPS 234 Underwriting Tools (PII On, Tools On, Econ Off)"
                >
                  <span className="text-xs font-bold text-amber-400">Stage 3</span>
                  <span className="text-[10px] font-semibold mt-0.5 leading-tight">Enterprise LVR</span>
                  <span className="text-[8px] opacity-70 mt-0.5">PII: On • Tools: On</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleStageSelect(4);
                    resetStagesTimer();
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                    currentStage === 4
                      ? 'bg-emerald-600/25 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-900/30 ring-1 ring-emerald-500/40 font-bold'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Stage 4: Tokenomics & Unit Economic Modeling (PII On, Tools On, Econ On)"
                >
                  <span className="text-xs font-bold text-emerald-400">Stage 4</span>
                  <span className="text-[10px] font-semibold mt-0.5 leading-tight">Tokenomics</span>
                  <span className="text-[8px] opacity-70 mt-0.5">PII: On • Tools: On • Econ: On</span>
                </button>
              </div>

              <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 leading-tight">
                {currentStage === 1 && "💡 Stage 1 Active: Basic memory preservation across Tier 1 ➔ 2 ➔ 3. (PII Shield: OFF, Tools: OFF, Tokenomics: OFF)"}
                {currentStage === 2 && "🔒 Stage 2 Active: Zero-PII cryptographic entity tokenization across tiers. (PII Shield: ON, Tools: OFF, Tokenomics: OFF)"}
                {currentStage === 3 && "📊 Stage 3 Active: Institutional APRA CPS 234 mathematical LVR calculation tools. (PII Shield: ON, Tools: ON, Tokenomics: OFF)"}
                {currentStage === 4 && "💰 Stage 4 Active: Enterprise Tokenomics & unit economic modeling with live token counters and rate cards. (PII Shield: ON, Tools: ON, Tokenomics: ON)"}
                {currentStage === 0 && "⚙️ Custom Mode Active: Custom configuration active with individual feature toggles."}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions: Reset Demo, Settings & Reset Session */}
      <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2 shrink-0">
        {onResetDemo && (
          <button
            onClick={onResetDemo}
            disabled={isResettingDemo}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 border border-emerald-400/40 flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-[0.99]"
            title="Reset Demo: Sets stages back to 1, clears all memory, and ensures Tier 3 Gemma enclave is active and reachable"
          >
            {isResettingDemo ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Resetting Demo...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Reset Demo</span>
              </>
            )}
          </button>
        )}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 border border-blue-400/30 flex items-center justify-center gap-2 transition"
            title="Open Regional Catalog, Enclave Management, and Live Telemetry Logs"
          >
            <span>⚙️</span>
            <span>Settings &amp; Logs</span>
          </button>
        )}
        <button
          onClick={onResetChat}
          className="w-full py-2 px-4 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center justify-center gap-2 transition shadow-sm"
          title="Clear chat transcript and reset session state"
        >
          <span>🔄</span>
          <span>Reset Chat</span>
        </button>
      </div>
    </aside>
  );
};

