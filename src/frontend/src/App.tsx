// Copyright 2026 Google LLC. All Rights Reserved.
import { useState, useEffect } from 'react';
import { ChatMessage, ExecutionMetadata, SimulationControls, RegionInfo, TierSettingsMap, BuildInfo } from './types';
import { TelemetryHeader } from './components/TelemetryHeader';
import { ChaosPanel } from './components/ChaosPanel';
import { ChatWindow } from './components/ChatWindow';
import { SettingsModal } from './components/SettingsModal';

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
  const [catalog, setCatalog] = useState<RegionInfo[]>([]);
  const [tierSettings, setTierSettings] = useState<TierSettingsMap>({
    TIER_1_GLOBAL: { region: 'global', model: 'gemini-3.7-flash' },
    TIER_2_REGIONAL: { region: 'jurisdictional-subregion-1', model: 'gemini-2.5-flash' },
    TIER_3_SOVEREIGN: { region: 'airgap-vpc-sovereign', model: 'google/gemma-2-9b-it' },
  });
  const [controls, setControls] = useState<SimulationControls>({
    failedTiers: [],
    forcedTier: 'AUTO',
    enablePiiTokenizer: true,
    tierSettings: {
      TIER_1_GLOBAL: { region: 'global', model: 'gemini-3.7-flash' },
      TIER_2_REGIONAL: { region: 'jurisdictional-subregion-1', model: 'gemini-2.5-flash' },
      TIER_3_SOVEREIGN: { region: 'airgap-vpc-sovereign', model: 'google/gemma-2-9b-it' },
    },
  });

  useEffect(() => {
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

  const handleResetChat = () => {
    setMessages([]);
    setMetadataHistory([]);
    const newId = `session-${Date.now()}`;
    localStorage.setItem('sovereign_session_id', newId);
    setSessionId(newId);
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-slate-950 font-sans text-slate-100">
      <TelemetryHeader
        lastMetadata={lastMetadata}
        buildInfo={buildInfo}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onResetChat={handleResetChat}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <ChaosPanel
          controls={controls}
          onChange={(newControls) => setControls({ ...newControls, tierSettings })}
          metadataList={metadataHistory}
          onResetChat={handleResetChat}
        />
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          enablePiiTokenizer={controls.enablePiiTokenizer}
        />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        catalog={catalog}
        tierSettings={tierSettings}
        onSaveSettings={handleSaveSettings}
        controls={controls}
        onUpdateControls={setControls}
      />
    </div>
  );
}
