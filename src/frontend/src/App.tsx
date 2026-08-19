// Copyright 2026 Google LLC. All Rights Reserved.
import { useState, useEffect } from 'react';
import { ChatMessage, ExecutionMetadata, SimulationControls, RegionInfo, TierSettingsMap } from './types';
import { TelemetryHeader } from './components/TelemetryHeader';
import { ChaosPanel } from './components/ChaosPanel';
import { ChatWindow } from './components/ChatWindow';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [sessionId, setSessionId] = useState<string>(() => `session-${Date.now()}`);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [metadataHistory, setMetadataHistory] = useState<ExecutionMetadata[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [catalog, setCatalog] = useState<RegionInfo[]>([]);
  const [tierSettings, setTierSettings] = useState<TierSettingsMap>({
    TIER_1_GLOBAL: { region: 'global', model: 'gemini-3.7-flash' },
    TIER_2_REGIONAL: { region: 'jurisdictional-subregion-1', model: 'gemini-2.5-flash' },
    TIER_3_SOVEREIGN: { region: 'airgap-vpc-sovereign', model: 'google/gemma-2-9b-it' },
  });
  const [controls, setControls] = useState<SimulationControls>({
    injectMockFailure: false,
    forcedTier: 'AUTO',
    tierSettings: {
      TIER_1_GLOBAL: { region: 'global', model: 'gemini-3.7-flash' },
      TIER_2_REGIONAL: { region: 'jurisdictional-subregion-1', model: 'gemini-2.5-flash' },
      TIER_3_SOVEREIGN: { region: 'airgap-vpc-sovereign', model: 'google/gemma-2-9b-it' },
    },
  });

  useEffect(() => {
    fetch('/api/models')
      .then((res) => res.json())
      .then((data) => {
        if (data.catalog) setCatalog(data.catalog);
        if (data.activeTierSettings) {
          setTierSettings(data.activeTierSettings);
          setControls((prev) => ({ ...prev, tierSettings: data.activeTierSettings }));
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
        throw new Error(`Gateway returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const meta: ExecutionMetadata = data.executionMetadata;

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toLocaleTimeString(),
        metadata: meta,
      };

      setMessages((prev) => [...prev, assistantMsg]);
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
    setSessionId(`session-${Date.now()}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 font-sans text-slate-100">
      <TelemetryHeader
        lastMetadata={lastMetadata}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onResetChat={handleResetChat}
      />
      <div className="flex flex-1 overflow-hidden">
        <ChaosPanel
          controls={controls}
          onChange={(newControls) => setControls({ ...newControls, tierSettings })}
          metadataList={metadataHistory}
          onResetChat={handleResetChat}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
        />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        catalog={catalog}
        tierSettings={tierSettings}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
}
