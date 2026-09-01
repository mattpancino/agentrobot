import React from 'react';
import { ExecutionMetadata, BuildInfo, DatasetSummary } from '../types';

interface TelemetryHeaderProps {
  currentStage?: number;
  lastMetadata?: ExecutionMetadata;
  buildInfo?: BuildInfo;
  datasetSummary?: DatasetSummary | null;
  enterpriseDataEnabled?: boolean;
  onOpenSettings?: () => void;
}

const STAGE_TITLES: Record<number, string> = {
  0: 'Stage 0: Genesis Lab',
  1: 'Stage 1: Core Memory',
  2: 'Stage 2: Zero-PII',
  3: 'Stage 3: Add Skills - LVR',
  4: 'Stage 4: Tokenomics',
};

export const TelemetryHeader: React.FC<TelemetryHeaderProps> = ({ currentStage = 1 }) => {
  const stageTitle =
    STAGE_TITLES[currentStage] ??
    (currentStage !== undefined ? `Stage ${currentStage}` : 'Stage 1: Core Memory');

  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-md">
      <h1 className="text-base md:text-lg font-bold tracking-tight text-white font-sans bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
        Anatomy of an Agent - {stageTitle}
      </h1>
    </header>
  );
};


