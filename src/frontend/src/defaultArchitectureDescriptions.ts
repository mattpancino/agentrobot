// Copyright 2026 Google LLC. All Rights Reserved.
import { ArchitectureDescriptionMap, ArchitectureFunctionKey } from './types';

export const DEFAULT_ARCHITECTURE_DESCRIPTIONS: ArchitectureDescriptionMap = {
  runtime:
    'Executes the agent core logic, session orchestration, and stateful turn loop within governed boundary isolation (Vertex AI Agent Engine in AU-SYD vs. Private On-Prem VPC).',
  modelLocation:
    'Defines physical data residency and geographical jurisdiction for model inference (e.g. Global Multi-Region API, Sydney australia-southeast1, or Local On-Prem).',
  model:
    'The active Large Language Model executing token generation (e.g., Gemini 3.7 Flash frontier model, Gemini 2.5 Flash regional model, or self-hosted Gemma 2 open weights).',
  memory:
    'The stateful conversation persistence layer ensuring session context continuity across failover hops (dual-tier replicating Redis store & Vertex AI Managed Sessions).',
  piiCleanser:
    'Deterministic zero-egress privacy engine intercepting and pseudonymizing sensitive entities (TFNs, Medicare, BSB, Customer Names) before prompt transit.',
  skill:
    'Domain-specific reasoning directives and regulatory rulebooks (such as APRA CPS 234 & APS 220 compliance frameworks) guiding agent actions and decision criteria.',
  tool:
    'Deterministic typed Python functions enabling exact mathematical computations, portfolio calculations, and structured dataset queries without LLM hallucination.',
  storageRest:
    'Governed data storage residency at rest (CMEK-encrypted Cloud Storage gs://au-fsi-customer-assets/ and local on-prem disk mirrors at /src/data).',
};

export const ARCHITECTURE_FUNCTION_METADATA: Record<
  ArchitectureFunctionKey,
  { label: string; icon: string; category: string; technicalDoc: string }
> = {
  runtime: {
    label: 'Execution Runtime',
    icon: '⚙️',
    category: 'Compute & Orchestration',
    technicalDoc:
      'Provides the sandboxed execution environment for the agent orchestrator. In Tier 1 and 2, leverages Vertex AI Agent Engine with regional compliance. In Tier 3, executes on isolated Compute Engine / GKE nodes in an airgapped on-prem VPC.',
  },
  modelLocation: {
    label: 'Model Location & Data Residency',
    icon: '📍',
    category: 'Jurisdictional Sovereignty',
    technicalDoc:
      'Enforces sovereign boundary compliance. Under Australian APRA CPS 234 regulations, customer financial context must be restricted to Australian data centers (australia-southeast1) or on-prem storage.',
  },
  model: {
    label: 'Foundation Model',
    icon: '⚡',
    category: 'LLM Intelligence',
    technicalDoc:
      'Dynamically routed LLM tier. When higher-tier API quotas fail or cross-border connections sever, the routing engine switches models down the cascade without losing context.',
  },
  memory: {
    label: 'Stateful Memory & Session Store',
    icon: '💾',
    category: 'State Persistence',
    technicalDoc:
      'Dual-tier session synchronization mechanism. Every conversation turn is written to both the hot primary session store and an asynchronous replication standby replica to guarantee instant recovery upon failover.',
  },
  piiCleanser: {
    label: 'PII Cleanser & Cryptographic Tokenizer',
    icon: '🛡️',
    category: 'Zero-Trust Privacy',
    technicalDoc:
      'High-performance tokenization sidecar utilizing Microsoft Presidio and spaCy NER. Tokenizes Tax File Numbers, Medicare numbers, and personal identities with session-isolated salts before sending queries to LLMs.',
  },
  skill: {
    label: 'Sovereign Agent Skill',
    icon: '🧠',
    category: 'Domain Directives & Governance',
    technicalDoc:
      'Encapsulates regulatory rulebooks (e.g. APRA CPS 234 Underwriter) and procedural instructions that ensure the agent adheres strictly to institutional credit risk and compliance guidelines.',
  },
  tool: {
    label: 'Deterministic Tool',
    icon: '🔧',
    category: 'Mathematical Tooling',
    technicalDoc:
      'Institutional Python calculations (LVR, DTI, monthly amortization, APRA +3% rate shock buffers) invoked deterministically to avoid mathematical hallucination.',
  },
  storageRest: {
    label: 'Storage at Rest Residency',
    icon: '📁',
    category: 'Data Governance',
    technicalDoc:
      'Secures enterprise datasets and audit logs. Governed by Customer-Managed Encryption Keys (CMEK) in regional cloud storage, mirrored locally on-prem.',
  },
};
