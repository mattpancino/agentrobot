import React from 'react';
import { ExecutionMetadata, BuildInfo, DatasetSummary } from '../types';

interface TelemetryHeaderProps {
  lastMetadata?: ExecutionMetadata;
  buildInfo?: BuildInfo;
  datasetSummary?: DatasetSummary | null;
  enterpriseDataEnabled?: boolean;
  onOpenSettings?: () => void;
}

export const TelemetryHeader: React.FC<TelemetryHeaderProps> = () => {
  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-md">
      <h1 className="text-base md:text-lg font-bold tracking-tight text-white font-sans bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
        Sovereign Agent Demo
      </h1>
    </header>
  );
};

