import { useState, useEffect } from 'react';
import {
  ChatMessage,
  ExecutionMetadata,
  SimulationControls,
  RegionInfo,
  TierSettingsMap,
  BuildInfo,
  DatasetSummary,
  ArchitectureDescriptionMap,
  ArchitectureModalState,
} from './types';
import { DEFAULT_ARCHITECTURE_DESCRIPTIONS } from './defaultArchitectureDescriptions';
import { TelemetryHeader } from './components/TelemetryHeader';
import { ChaosPanel } from './components/ChaosPanel';
import { ChatWindow } from './components/ChatWindow';
import { StageZeroLab } from './components/StageZeroLab';
import { SettingsModal } from './components/SettingsModal';
import { ArchitectureInfoModal } from './components/ArchitectureInfoModal';

export default function App() {
  const [sessionId, setSessionId] = useState<string>(() => {
    const stored = localStorage.getItem('sovereign_session_id');
    if (stored) return stored;
    const newId = `session-${Date.now()}`;
    localStorage.setItem('sovereign_session_id', newId);
    return newId;
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [metadataHistory, setMetadataHistory] = useState<ExecutionMetadata[]>([]);
  const [buildInfo, setBuildInfo] = useState<BuildInfo | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<string | undefined>(undefined);
  const [catalog, setCatalog] = useState<RegionInfo[]>([]);
  const [datasetSummary, setDatasetSummary] = useState<DatasetSummary | null>(null);
  const [architectureDescriptions, setArchitectureDescriptions] = useState<ArchitectureDescriptionMap>(() => {
    try {
      const saved = localStorage.getItem('sovereign_architecture_descriptions');
      if (saved) {
        return { ...DEFAULT_ARCHITECTURE_DESCRIPTIONS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to parse cached architecture descriptions:', e);
    }
    return DEFAULT_ARCHITECTURE_DESCRIPTIONS;
  });
  const [activeArchitectureModal, setActiveArchitectureModal] = useState<ArchitectureModalState | null>(null);
  const [tierSettings, setTierSettings] = useState<TierSettingsMap>({
    TIER_1_GLOBAL: { region: 'global', model: 'gemini-3.7-flash' },
    TIER_2_REGIONAL: { region: 'jurisdictional-subregion-1', model: 'gemini-2.5-flash' },
    TIER_3_SOVEREIGN: { region: 'airgap-vpc-sovereign', model: 'google/gemma-2-9b-it' },
  });
  const [controls, setControls] = useState<SimulationControls>({
    stage: 0,
    stageZeroRuntimeEnabled: false,
    stageZeroIntelligenceEnabled: false,
    failedTiers: [],
    forcedTier: 'AUTO',
    enablePiiTokenizer: false,
    enterpriseDataEnabled: false,
    tokenomicsEnabled: false,
    tierSettings: {
      TIER_1_GLOBAL: { region: 'global', model: 'gemini-3.7-flash' },
      TIER_2_REGIONAL: { region: 'jurisdictional-subregion-1', model: 'gemini-2.5-flash' },
      TIER_3_SOVEREIGN: { region: 'airgap-vpc-sovereign', model: 'google/gemma-2-9b-it' },
    },
  });

  useEffect(() => {
    fetch('/api/dataset')
      .then((res) => res.json())
      .then((data: DatasetSummary) => {
        if (data) {
          setDatasetSummary(data);
          setControls((prev) => ({
            ...prev,
            enterpriseDataEnabled: data.enabled !== undefined ? data.enabled : true,
          }));
        }
      })
      .catch((err) => console.error('Failed to load dataset info:', err));

    fetch(`/api/session/${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.messages && data.messages.length > 0) {
          const loadedMsgs: ChatMessage[] = data.messages.map((m: any, idx: number) => ({
            id: `msg-${idx}-${m.role}`,
            role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
            timestamp: '',
          }));
          setMessages(loadedMsgs);
        }
      })
      .catch((err) => console.error('Failed to load session history:', err));

    fetch('/api/models')
      .then((res) => res.json())
      .then((data) => {
        if (data.catalog) setCatalog(data.catalog);
        if (data.activeTierSettings) {
          setTierSettings(data.activeTierSettings);
          setControls((prev) => ({ ...prev, tierSettings: data.activeTierSettings }));
        }
        if (data.architectureDescriptions) {
          setArchitectureDescriptions((prev) => ({
            ...prev,
            ...data.architectureDescriptions,
          }));
        }
        if (data.buildInfo) {
          setBuildInfo(data.buildInfo);
        } else {
          fetch('/api/build-info')
            .then((r) => r.json())
            .then((info) => setBuildInfo(info))
            .catch(() => {});
        }
      })
      .catch((err) => console.error('Failed to load regional models catalog:', err));
  }, []);

  const handleSaveSettings = async (updatedSettings: TierSettingsMap) => {
    setTierSettings(updatedSettings);
    setControls((prev) => ({ ...prev, tierSettings: updatedSettings }));

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierSettings: updatedSettings }),
      });
    } catch (err) {
      console.error('Failed to sync tier settings to backend:', err);
    }
  };

  const handleSaveArchitectureDescriptions = async (updated: ArchitectureDescriptionMap) => {
    setArchitectureDescriptions(updated);
    try {
      localStorage.setItem('sovereign_architecture_descriptions', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to cache architecture descriptions:', e);
    }

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ architectureDescriptions: updated }),
      });
    } catch (err) {
      console.error('Failed to sync architecture descriptions to backend:', err);
    }
  };

  const handleOpenSettings = (tab?: string) => {
    setSettingsInitialTab(tab || 'tiers');
    setIsSettingsOpen(true);
  };

  const lastMetadata = metadataHistory[metadataHistory.length - 1];

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: text,
          simulationControls: {
            ...controls,
            tierSettings: tierSettings,
          },
        }),
      });

      if (!response.ok) {
        let errorDetail = `Gateway returned HTTP ${response.status}`;
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errorDetail = errData.detail;
          }
        } catch (_) {}
        throw new Error(errorDetail);
      }

      const data = await response.json();
      const meta: ExecutionMetadata = data.executionMetadata;

      // Update user message with tokenizedPrompt
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].id === userMsg.id) {
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            metadata: meta,
            tokenizedContent: meta?.tokenizedPrompt,
          };
        }
        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: data.content,
          tokenizedContent: data.tokenizedContent,
          timestamp: new Date().toLocaleTimeString(),
          metadata: meta,
        };
        return [...updated, assistantMsg];
      });

      setMetadataHistory((prev) => [...prev, meta]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `[ADK Gateway Communication Error] Failed to complete chat turn: ${errorMessage}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const [isResettingDemo, setIsResettingDemo] = useState<boolean>(false);

  const handleResetChat = () => {
    setMessages([]);
    setMetadataHistory([]);
    const newId = `session-${Date.now()}`;
    localStorage.setItem('sovereign_session_id', newId);
    setSessionId(newId);
  };

  const handleResetDemo = async () => {
    setIsResettingDemo(true);
    try {
      // 1. Clear frontend chat & metadata state
      setMessages([]);
      setMetadataHistory([]);
      const newId = `session-${Date.now()}`;
      localStorage.setItem('sovereign_session_id', newId);
      setSessionId(newId);

      // 2. Reset frontend stage controls to Stage 0 (Breakers open/off, PII Off, Tools Off, Econ Off, Auto routing, no failed tiers)
      setControls((prev) => ({
        ...prev,
        stage: 0,
        stageZeroRuntimeEnabled: false,
        stageZeroIntelligenceEnabled: false,
        enablePiiTokenizer: false,
        enterpriseDataEnabled: false,
        tokenomicsEnabled: false,
        forcedTier: 'AUTO',
        failedTiers: [],
      }));

      // 3. Call backend endpoint to clear Redis / memory, reset defaults, and verify Tier 3 / Gemma
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.datasetSummary) {
          setDatasetSummary(data.datasetSummary);
        }
        if (data.tierSettings) {
          setTierSettings(data.tierSettings);
          setControls((prev) => ({ ...prev, tierSettings: data.tierSettings }));
        }
      }
    } catch (err) {
      console.error('Failed to reset demo:', err);
    } finally {
      setIsResettingDemo(false);
    }
  };

  const handleToggleStageZeroRuntime = async (enabled: boolean) => {
    setControls((prev) => ({ ...prev, stageZeroRuntimeEnabled: enabled }));
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageZeroRuntimeEnabled: enabled }),
      });
    } catch (err) {
      console.error('Failed to sync stageZeroRuntimeEnabled:', err);
    }
  };

  const handleToggleStageZeroIntelligence = async (enabled: boolean) => {
    setControls((prev) => ({ ...prev, stageZeroIntelligenceEnabled: enabled }));
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageZeroIntelligenceEnabled: enabled }),
      });
    } catch (err) {
      console.error('Failed to sync stageZeroIntelligenceEnabled:', err);
    }
  };

  const handleSelectStage = async (stage: number) => {
    handleResetChat();
    const isStage0 = stage === 0;
    const isPii = stage === 2 || stage === 3 || stage === 4;
    const isEnterprise = stage === 3 || stage === 4;
    const isTokenomics = stage === 4;

    const newTierSettings: TierSettingsMap = isTokenomics
      ? {
          TIER_1_GLOBAL: { region: 'us-central1', model: 'claude-3-5-sonnet-v2@20241022' },
          TIER_2_REGIONAL: { region: 'jurisdictional-subregion-1', model: 'gemini-2.5-flash' },
          TIER_3_SOVEREIGN: { region: 'airgap-vpc-sovereign', model: 'google/gemma-2-9b-it' },
        }
      : {
          TIER_1_GLOBAL: { region: 'global', model: 'gemini-3.7-flash' },
          TIER_2_REGIONAL: { region: 'jurisdictional-subregion-1', model: 'gemini-2.5-flash' },
          TIER_3_SOVEREIGN: { region: 'airgap-vpc-sovereign', model: 'google/gemma-2-9b-it' },
        };

    setTierSettings(newTierSettings);
    setControls((prev) => ({
      ...prev,
      stage,
      stageZeroRuntimeEnabled: isStage0 ? false : true,
      stageZeroIntelligenceEnabled: isStage0 ? false : true,
      enablePiiTokenizer: isPii,
      enterpriseDataEnabled: isEnterprise,
      tokenomicsEnabled: isTokenomics,
      tierSettings: newTierSettings,
      forcedTier: 'AUTO',
      failedTiers: [],
    }));

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageZeroRuntimeEnabled: isStage0 ? false : true,
          stageZeroIntelligenceEnabled: isStage0 ? false : true,
          enterpriseDataEnabled: isEnterprise,
          tokenomicsEnabled: isTokenomics,
          tierSettings: newTierSettings,
        }),
      });
      await fetch('/api/dataset/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: isEnterprise }),
      });
    } catch (err) {
      console.error('Failed to sync stage settings:', err);
    }
  };

  const currentStage =
    controls.stage !== undefined
      ? controls.stage
      : controls.enablePiiTokenizer && controls.enterpriseDataEnabled && controls.tokenomicsEnabled
      ? 4
      : controls.enablePiiTokenizer && controls.enterpriseDataEnabled && !controls.tokenomicsEnabled
      ? 3
      : controls.enablePiiTokenizer && !controls.enterpriseDataEnabled && !controls.tokenomicsEnabled
      ? 2
      : !controls.enablePiiTokenizer && !controls.enterpriseDataEnabled && !controls.tokenomicsEnabled && (controls.stageZeroRuntimeEnabled === false || controls.stageZeroIntelligenceEnabled === false)
      ? 0
      : 1;

  useEffect(() => {
    const stageTitles: Record<number, string> = {
      0: 'Stage 0: Genesis Lab',
      1: 'Stage 1: Core Memory',
      2: 'Stage 2: Zero-PII',
      3: 'Stage 3: Add Skills - LVR',
      4: 'Stage 4: Tokenomics',
    };
    const title = stageTitles[currentStage] || `Stage ${currentStage}`;
    document.title = `Anatomy of an Agent - ${title}`;
  }, [currentStage]);

  const isEnterpriseActive = controls.enterpriseDataEnabled ?? datasetSummary?.enabled ?? false;

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-slate-950 font-sans text-slate-100">
      <TelemetryHeader
        currentStage={currentStage}
        lastMetadata={lastMetadata}
        buildInfo={buildInfo}
        datasetSummary={datasetSummary}
        enterpriseDataEnabled={isEnterpriseActive}
        onOpenSettings={() => handleOpenSettings()}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <ChaosPanel
          controls={controls}
          onChange={(newControls) => setControls({ ...newControls, tierSettings })}
          metadataList={metadataHistory}
          onResetChat={handleResetChat}
          onResetDemo={handleResetDemo}
          isResettingDemo={isResettingDemo}
          onOpenSettings={(tab) => handleOpenSettings(tab)}
          onSelectStage={handleSelectStage}
          onOpenArchitectureModal={setActiveArchitectureModal}
        />
        {currentStage === 0 ? (
          <StageZeroLab
            runtimeEnabled={controls.stageZeroRuntimeEnabled ?? false}
            intelligenceEnabled={controls.stageZeroIntelligenceEnabled ?? false}
            onToggleRuntime={handleToggleStageZeroRuntime}
            onToggleIntelligence={handleToggleStageZeroIntelligence}
            onAdvanceToStageOne={() => handleSelectStage(1)}
          />
        ) : (
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            enablePiiTokenizer={controls.enablePiiTokenizer}
            enterpriseDataEnabled={isEnterpriseActive}
            tokenomicsEnabled={controls.tokenomicsEnabled}
          />
        )}
      </div>

      {/* Metadata Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 px-6 py-2.5 flex flex-wrap items-center gap-3 shrink-0 z-20 text-xs font-mono">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="font-bold text-xs tracking-tight text-white font-sans">Project Sovereign-Stream</span>
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
      </footer>

      {/* Dynamic Architecture / Tool / Skill Modal */}
      <ArchitectureInfoModal
        modalState={activeArchitectureModal}
        onClose={() => setActiveArchitectureModal(null)}
        descriptions={architectureDescriptions}
        datasetSummary={datasetSummary}
        onOpenSettings={(tab) => handleOpenSettings(tab)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        catalog={catalog}
        tierSettings={tierSettings}
        onSaveSettings={handleSaveSettings}
        controls={controls}
        onUpdateControls={setControls}
        onDatasetUpdate={(updated) => {
          setDatasetSummary(updated);
          setControls((prev) => ({ ...prev, enterpriseDataEnabled: updated.enabled }));
        }}
        architectureDescriptions={architectureDescriptions}
        onSaveArchitectureDescriptions={handleSaveArchitectureDescriptions}
        initialTab={settingsInitialTab}
      />
    </div>
  );
}
