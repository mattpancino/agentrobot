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
  status:
    | 'IDLE_HEALTHY'
    | 'PROBING_BACKGROUND'
    | 'PROMOTED_RESTORED'
    | 'PROBE_FAILED_HYSTERESIS_RESET'
    | 'FORCE_FAILED';
  targetTier: string;
  probeIntervalSec: number;
  consecutiveSuccesses: number;
  requiredSuccesses: number;
  lastProbeLatencyMs?: number;
  failedTiers?: string[];
  message: string;
}

export interface PIIEntityRecord {
  type: string;
  token: string;
  maskedSnippet: string;
  confidence: number;
}

export interface PIITelemetry {
  enabled: boolean;
  entitiesIntercepted: number;
  scanDurationMs: number;
  entities: PIIEntityRecord[];
  tokenizedPrompt?: string;
  tokenizedResponse?: string;
  zeroEgressVerified: boolean;
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
  tier3Synced?: boolean;
  tier3SyncStatus?: string;
  replicationLogs?: string[];
  piiTelemetry?: PIITelemetry;
  tokenizedPrompt?: string;
  tokenizedResponse?: string;
}

export interface RedisSyncTelemetry {
  tier3Synced?: boolean;
  syncStatus?: string;
  standbyEndpoint?: string;
  lastSyncLogs?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tokenizedContent?: string;
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

export interface CustomPIIRule {
  name: string;
  pattern: string;
  entity_type?: string;
  confidence?: number;
  description?: string;
  enabled?: boolean;
}

export interface SimulationControls {
  failedTiers?: string[];
  injectMockFailure?: boolean;
  forcedTier: 'AUTO' | 'TIER_1_GLOBAL' | 'TIER_2_REGIONAL' | 'TIER_3_SOVEREIGN';
  tierSettings?: TierSettingsMap;
  enablePiiTokenizer?: boolean;
  customPiiRules?: CustomPIIRule[];
  enterpriseDataEnabled?: boolean;
}

export interface BuildInfo {
  buildTime: string;
  branch: string;
}

export interface LoanCustomerRow {
  status?: string;
  customerId: string;
  customerName: string;
  propertyValueAud: number;
  loanBalanceAud: number;
  annualIncomeAud: number;
  monthlyExpensesAud: number;
  currentInterestRatePct: number;
  loanTermYears: number;
  lvrPercent: number;
  lmiRequired: boolean;
  lmiThresholdExceededByAud: number;
  dtiRatio: number;
  baseMonthlyRepaymentAud: number;
  stressedInterestRatePct: number;
  stressedMonthlyRepaymentAud: number;
  grossMonthlyIncomeAud?: number;
  monthlySurplusBufferAud: number;
  apraStressTestPassed: boolean;
  riskTier: string;
  storageResidency?: string;
}

export interface DatasetStats {
  totalLoanBookAud: number;
  averageLvrPercent: number;
  highLvrAccountsCount: number;
  apraStressFailuresCount: number;
}

export interface DatasetStorageResidency {
  cloudStorageBucket: string;
  jurisdiction: string;
  encryption: string;
  localMirrorStatus: string;
}

export interface DatasetSummary {
  enabled: boolean;
  filename: string;
  filePath: string;
  rowCount: number;
  columns: string[];
  rows: LoanCustomerRow[];
  stats: DatasetStats;
  storageResidency: DatasetStorageResidency;
}
