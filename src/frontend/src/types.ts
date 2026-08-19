// Copyright 2026 Google LLC. All Rights Reserved.
// Project Sovereign-Stream TypeScript definitions

export interface FailoverHopLog {
  tier: string;
  attemptedModel: string;
  status: 'SUCCESS' | 'FAILED';
  error?: string;
  durationMs: number;
}

export interface RecoverySentinelStatus {
  status: 'IDLE_HEALTHY' | 'PROBING_BACKGROUND' | 'PROMOTED_RESTORED' | 'PROBE_FAILED_HYSTERESIS_RESET';
  targetTier: string;
  probeIntervalSec: number;
  consecutiveSuccesses: number;
  requiredSuccesses: number;
  lastProbeLatencyMs?: number;
  message: string;
}

export interface ExecutionMetadata {
  activeTier: 'TIER_1_GLOBAL' | 'TIER_2_REGIONAL' | 'TIER_3_SOVEREIGN';
  modelUsed: string;
  executionLocation: string;
  sovereigntyClassification: string;
  routingMode: 'NORMAL' | 'STICKY_FALLBACK' | 'MANUAL_OVERRIDE';
  latencyMs: number;
  wastedLatencyAvoidedMs: number;
  failoverOccurred: boolean;
  failoverHops: number;
  failoverLog: FailoverHopLog[];
  recoverySentinel?: RecoverySentinelStatus;
  tierSettings?: Record<string, { region: string; model: string }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: ExecutionMetadata;
}

export interface ModelInfo {
  id: string;
  name: string;
  type: string;
  recommended?: boolean;
  description: string;
}

export interface RegionInfo {
  regionId: string;
  name: string;
  tier: string;
  sovereigntyClassification: string;
  description: string;
  models: ModelInfo[];
}

export interface TierSetting {
  region: string;
  model: string;
}

export type TierSettingsMap = Record<string, TierSetting>;

export interface SimulationControls {
  injectMockFailure: boolean;
  forcedTier: 'AUTO' | 'TIER_1_GLOBAL' | 'TIER_2_REGIONAL' | 'TIER_3_SOVEREIGN';
  tierSettings?: TierSettingsMap;
}
