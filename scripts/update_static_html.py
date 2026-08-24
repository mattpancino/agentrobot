# Copyright 2026 Google LLC. All Rights Reserved.
# Script to update src/backend/static/index.html with Enterprise Data features
import re

with open("src/backend/static/index.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. Update TelemetryHeader to show isDatasetActive pill
old_header_start = 'function TelemetryHeader({ lastMetadata, buildInfo, onOpenSettings, onResetChat }) {'
new_header_start = '''function TelemetryHeader({ lastMetadata, buildInfo, datasetSummary, enterpriseDataEnabled, onOpenSettings, onResetChat }) {
      const isDatasetActive = (enterpriseDataEnabled && datasetSummary?.enabled !== false) || datasetSummary?.enabled === true;'''

html = html.replace(old_header_start, new_header_start)

# Add dataset pill to TelemetryHeader empty state
old_empty_header_span = '''              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
                ADK 3-Tier Sovereign Cascade
              </span>'''

new_empty_header_span = '''              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
                ADK 3-Tier Sovereign Cascade
              </span>
              {isDatasetActive && (
                <button
                  onClick={onOpenSettings}
                  className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-xs font-mono border border-amber-500/40 flex items-center gap-1.5 hover:bg-amber-500/25 transition shadow-sm"
                  title="Active Australian Loan Book Ingested & Active • Click to manage Trix datasets"
                >
                  <span>📊</span>
                  <span className="font-semibold text-amber-200">Active Loan Book:</span>
                  <span>{datasetSummary?.rowCount || 5} Mortgages</span>
                  <span className="hidden xl:inline text-[11px] text-amber-400/80">(AU-SYD CMEK)</span>
                </button>
              )}'''

html = html.replace(old_empty_header_span, new_empty_header_span)

# Add dataset pill to TelemetryHeader active state
old_active_header_span = '''            <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
              Model: <span className="text-white font-semibold">{modelUsed}</span>
            </span>'''

new_active_header_span = '''            <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
              Model: <span className="text-white font-semibold">{modelUsed}</span>
            </span>
            {isDatasetActive && (
              <button
                onClick={onOpenSettings}
                className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-mono border border-amber-500/40 flex items-center gap-1.5 hover:bg-amber-500/25 transition shadow-sm"
                title="Active Australian Loan Book Ingested & Active • Click to manage Trix datasets"
              >
                <span>📊</span>
                <span className="font-semibold text-amber-200">Active Loan Book:</span>
                <span>{datasetSummary?.rowCount || 5} Mortgages</span>
                <span className="hidden xl:inline text-[11px] text-amber-400/80">(AU-SYD CMEK)</span>
              </button>
            )}'''

html = html.replace(old_active_header_span, new_active_header_span)

# 2. Update ChaosPanel character & architecture rows
old_char_switch = '''        switch (activeTier) {
          case 'TIER_2_REGIONAL':
            return {
              name: 'Regional Agent',
              runtime: 'Vertex AI Agent Engine (AU-SYD)',
              runtimeColor: 'text-amber-400 font-semibold',
              inference: 'In-Country Vertex AI (AU-SYD)',
              inferenceColor: 'text-amber-400 font-semibold',
              memory: 'Vertex AI Managed Sessions (AU-SYD)',
              memoryColor: 'text-amber-400 font-semibold',
              piiCleanser: piiCleanserText,
              piiCleanserColor: piiCleanserColor,
              color: 'amber',
              borderClass: 'border-amber-500/40 bg-gradient-to-b from-amber-950/40 to-slate-950',
              glowClass: 'shadow-lg shadow-amber-500/10',
              eyeColor: '#f59e0b',
              pulseClass: 'bg-amber-500',
            };
          case 'TIER_3_SOVEREIGN':
            return {
              name: 'On-Prem Agent',
              runtime: 'Private Isolated VPC Enclave',
              runtimeColor: 'text-emerald-400 font-semibold',
              inference: 'Self-Hosted Gemma 2 (Local)',
              inferenceColor: 'text-emerald-400 font-semibold',
              memory: 'Tier 3 Local Standby Replica',
              memoryColor: 'text-emerald-400 font-semibold',
              piiCleanser: piiCleanserText,
              piiCleanserColor: piiCleanserColor,
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
              inference: 'Global Hyperscaler API',
              inferenceColor: 'text-blue-400 font-semibold',
              memory: 'Vertex AI Managed Sessions (AU-SYD)',
              memoryColor: 'text-amber-400 font-semibold',
              piiCleanser: piiCleanserText,
              piiCleanserColor: piiCleanserColor,
              color: 'blue',
              borderClass: 'border-blue-500/40 bg-gradient-to-b from-blue-950/40 to-slate-950',
              glowClass: 'shadow-lg shadow-blue-500/10',
              eyeColor: '#3b82f6',
              pulseClass: 'bg-blue-500',
            };
        }'''

new_char_switch = '''        const skillText = activeTier === 'TIER_3_SOVEREIGN'
          ? 'APRA Enclave Rulebook (Local VPC)'
          : 'APRA Mortgage Underwriter (AU-SYD)';
        const skillColor = activeTier === 'TIER_3_SOVEREIGN'
          ? 'text-emerald-400 font-semibold'
          : 'text-amber-400 font-semibold';

        const toolText = activeTier === 'TIER_3_SOVEREIGN'
          ? 'calculate_customer_lvr (Airgap Enclave)'
          : 'calculate_customer_lvr (Local VM Engine)';
        const toolColor = 'text-emerald-400 font-semibold';

        const storageRestText = activeTier === 'TIER_3_SOVEREIGN'
          ? 'Local Enclave Disk Mirror (/src/data)'
          : 'gs://au-fsi-customer-assets/ (AU-SYD CMEK)';
        const storageRestColor = activeTier === 'TIER_3_SOVEREIGN'
          ? 'text-emerald-400 font-semibold'
          : 'text-amber-400 font-semibold';

        switch (activeTier) {
          case 'TIER_2_REGIONAL':
            return {
              name: 'Regional Agent',
              runtime: 'Vertex AI Agent Engine (AU-SYD)',
              runtimeColor: 'text-amber-400 font-semibold',
              inference: 'In-Country Vertex AI (AU-SYD)',
              inferenceColor: 'text-amber-400 font-semibold',
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
              color: 'amber',
              borderClass: 'border-amber-500/40 bg-gradient-to-b from-amber-950/40 to-slate-950',
              glowClass: 'shadow-lg shadow-amber-500/10',
              eyeColor: '#f59e0b',
              pulseClass: 'bg-amber-500',
            };
          case 'TIER_3_SOVEREIGN':
            return {
              name: 'On-Prem Agent',
              runtime: 'Private Isolated VPC Enclave',
              runtimeColor: 'text-emerald-400 font-semibold',
              inference: 'Self-Hosted Gemma 2 (Local)',
              inferenceColor: 'text-emerald-400 font-semibold',
              memory: 'Tier 3 Local Standby Replica',
              memoryColor: 'text-emerald-400 font-semibold',
              piiCleanser: piiCleanserText,
              piiCleanserColor: piiCleanserColor,
              skill: skillText,
              skillColor: skillColor,
              tool: toolText,
              toolColor: toolColor,
              storageRest: storageRestText,
              storageRestColor: storageRestColor,
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
              inference: 'Global Hyperscaler API',
              inferenceColor: 'text-blue-400 font-semibold',
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
              color: 'blue',
              borderClass: 'border-blue-500/40 bg-gradient-to-b from-blue-950/40 to-slate-950',
              glowClass: 'shadow-lg shadow-blue-500/10',
              eyeColor: '#3b82f6',
              pulseClass: 'bg-blue-500',
            };
        }'''

html = html.replace(old_char_switch, new_char_switch)

# Add skill/tool/storage rows to ChaosPanel architecture card
old_chaos_pii = '''                {controls.enablePiiTokenizer && (
                  <div className="flex items-start justify-between gap-2 text-slate-400 border-t border-slate-800/60 pt-1.5">
                    <span className="text-slate-500 shrink-0">🛡️ PII Cleanser:</span>
                    <span className={`text-right font-sans ${agentChar.piiCleanserColor}`}>
                      {agentChar.piiCleanser}
                    </span>
                  </div>
                )}'''

new_chaos_pii = '''                {controls.enablePiiTokenizer && (
                  <div className="flex items-start justify-between gap-2 text-slate-400 border-t border-slate-800/60 pt-1.5">
                    <span className="text-slate-500 shrink-0">🛡️ PII Cleanser:</span>
                    <span className={`text-right font-sans ${agentChar.piiCleanserColor}`}>
                      {agentChar.piiCleanser}
                    </span>
                  </div>
                )}
                {controls.enterpriseDataEnabled && (
                  <>
                    <div className="flex items-start justify-between gap-2 text-slate-400 border-t border-slate-800/60 pt-1.5">
                      <span className="text-slate-500 shrink-0">🧠 Skill:</span>
                      <span className={`text-right font-sans ${agentChar.skillColor}`}>
                        {agentChar.skill}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2 text-slate-400">
                      <span className="text-slate-500 shrink-0">🔧 Tool:</span>
                      <span className={`text-right font-sans ${agentChar.toolColor}`}>
                        {agentChar.tool}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2 text-slate-400">
                      <span className="text-slate-500 shrink-0">📁 Storage (Rest):</span>
                      <span className={`text-right font-sans ${agentChar.storageRestColor}`}>
                        {agentChar.storageRest}
                      </span>
                    </div>
                  </>
                )}'''

html = html.replace(old_chaos_pii, new_chaos_pii)

# 3. Update ChatWindow props, empty state, quick query bar, and input placeholder
old_chat_fn = 'function ChatWindow({ messages, isLoading, onSendMessage, enablePiiTokenizer = true }) {'
new_chat_fn = 'function ChatWindow({ messages, isLoading, onSendMessage, enablePiiTokenizer = true, enterpriseDataEnabled = false }) {'
html = html.replace(old_chat_fn, new_chat_fn)

old_chat_samples = '''                {[
                  "Transfer $500 from John Smith's account 123-456 to Jane Doe.",
                  "Customer Sarah Connor with TFN 123 456 782 and Medicare 2123 45670 1 requested balance audit.",
                  "What are our primary data governance obligations under APRA CPS 234?",
                  "Provide an incident response checklist for cross-border data transfer anomalies.",
                  "How do we prove zero PII egress when running sensitive FSI workloads?",
                ].map((sample) => ('''

new_chat_samples = '''                {(enterpriseDataEnabled
                  ? [
                      "📊 Calculate LVR, DTI, and LMI requirements for Sarah Jenkins (CUST-8821)",
                      "🚨 Run APRA +3.0% mortgage serviceability stress test on David Zhang (CUST-1042)",
                      "🏦 Assess Emma Watson (CUST-3310) for high LVR default risk and buffer breach",
                      "Customer Sarah Connor with TFN 123 456 782 and Medicare 2123 45670 1 requested balance audit.",
                      "What are our primary data governance obligations under APRA CPS 234?",
                    ]
                  : [
                      "Transfer $500 from John Smith's account 123-456 to Jane Doe.",
                      "Customer Sarah Connor with TFN 123 456 782 and Medicare 2123 45670 1 requested balance audit.",
                      "What are our primary data governance obligations under APRA CPS 234?",
                      "Provide an incident response checklist for cross-border data transfer anomalies.",
                      "How do we prove zero PII egress when running sensitive FSI workloads?",
                    ]
                ).map((sample) => ('''

html = html.replace(old_chat_samples, new_chat_samples)

old_chat_form = '''        {/* Input Box */}
        <form onSubmit={handleSubmit} className="p-4 bg-slate-900 border-t border-slate-800">'''

new_chat_form = '''        {/* Quick Action Chips Bar (When Enterprise Data / Trix is enabled) */}
        {enterpriseDataEnabled && (
          <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-slate-500 shrink-0 font-mono text-[11px] flex items-center gap-1">
              <span>⚡</span> Quick Queries:
            </span>
            <button
              type="button"
              onClick={() => onSendMessage("Calculate LVR, DTI, and LMI requirements for Sarah Jenkins (CUST-8821)")}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 whitespace-nowrap transition text-[11px] flex items-center gap-1.5 shadow-sm"
            >
              <span>📊</span>
              <span>Sarah Jenkins LVR &amp; LMI (CUST-8821)</span>
            </button>
            <button
              type="button"
              onClick={() => onSendMessage("Run APRA +3.0% mortgage serviceability stress test on David Zhang (CUST-1042)")}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 whitespace-nowrap transition text-[11px] flex items-center gap-1.5 shadow-sm"
            >
              <span>🚨</span>
              <span>David Zhang APRA +3% (CUST-1042)</span>
            </button>
            <button
              type="button"
              onClick={() => onSendMessage("Audit Emma Watson (CUST-3310) for high LVR default risk and buffer breach")}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 whitespace-nowrap transition text-[11px] flex items-center gap-1.5 shadow-sm"
            >
              <span>🏦</span>
              <span>Emma Watson LVR Risk (CUST-3310)</span>
            </button>
          </div>
        )}

        {/* Input Box */}
        <form onSubmit={handleSubmit} className="p-4 bg-slate-900 border-t border-slate-800">'''

html = html.replace(old_chat_form, new_chat_form)

old_placeholder = 'placeholder="Type your prompt (e.g. sensitive FSI query with John Smith, account 123-456)..."'
new_placeholder = 'placeholder={enterpriseDataEnabled ? "Ask about customer loans (e.g. Calculate LVR for Sarah Jenkins CUST-8821, or David Zhang APRA stress test)..." : "Type your prompt (e.g. sensitive FSI query with John Smith, account 123-456)..."}'
html = html.replace(old_placeholder, new_placeholder)

# 4. Update App component in index.html
old_app_top = '''    function App() {
      const [sessionId, setSessionId] = useState(() => {
        const stored = localStorage.getItem('sovereign_session_id');
        if (stored) return stored;
        const newId = `session-${Date.now()}`;
        localStorage.setItem('sovereign_session_id', newId);
        return newId;
      });
      const [messages, setMessages] = useState([]);
      const [metadataHistory, setMetadataHistory] = useState([]);
      const [buildInfo, setBuildInfo] = useState(undefined);
      const [isLoading, setIsLoading] = useState(false);
      const [isSettingsOpen, setIsSettingsOpen] = useState(false);
      const [catalog, setCatalog] = useState([]);
      const [tierSettings, setTierSettings] = useState({
        TIER_1_GLOBAL: { region: 'global', model: 'gemini-3.7-flash' },
        TIER_2_REGIONAL: { region: 'jurisdictional-subregion-1', model: 'gemini-2.5-flash' },
        TIER_3_SOVEREIGN: { region: 'airgap-vpc-sovereign', model: 'google/gemma-2-9b-it' },
      });
      const [controls, setControls] = useState({
        failedTiers: [],
        forcedTier: 'AUTO',
        enablePiiTokenizer: true,
        tierSettings: {
          TIER_1_GLOBAL: { region: 'global', model: 'gemini-3.7-flash' },
          TIER_2_REGIONAL: { region: 'jurisdictional-subregion-1', model: 'gemini-2.5-flash' },
          TIER_3_SOVEREIGN: { region: 'airgap-vpc-sovereign', model: 'google/gemma-2-9b-it' },
        },
      });'''

new_app_top = '''    function App() {
      const [sessionId, setSessionId] = useState(() => {
        const stored = localStorage.getItem('sovereign_session_id');
        if (stored) return stored;
        const newId = `session-${Date.now()}`;
        localStorage.setItem('sovereign_session_id', newId);
        return newId;
      });
      const [messages, setMessages] = useState([]);
      const [metadataHistory, setMetadataHistory] = useState([]);
      const [buildInfo, setBuildInfo] = useState(undefined);
      const [isLoading, setIsLoading] = useState(false);
      const [isSettingsOpen, setIsSettingsOpen] = useState(false);
      const [catalog, setCatalog] = useState([]);
      const [datasetSummary, setDatasetSummary] = useState(null);
      const [tierSettings, setTierSettings] = useState({
        TIER_1_GLOBAL: { region: 'global', model: 'gemini-3.7-flash' },
        TIER_2_REGIONAL: { region: 'jurisdictional-subregion-1', model: 'gemini-2.5-flash' },
        TIER_3_SOVEREIGN: { region: 'airgap-vpc-sovereign', model: 'google/gemma-2-9b-it' },
      });
      const [controls, setControls] = useState({
        failedTiers: [],
        forcedTier: 'AUTO',
        enablePiiTokenizer: true,
        enterpriseDataEnabled: true,
        tierSettings: {
          TIER_1_GLOBAL: { region: 'global', model: 'gemini-3.7-flash' },
          TIER_2_REGIONAL: { region: 'jurisdictional-subregion-1', model: 'gemini-2.5-flash' },
          TIER_3_SOVEREIGN: { region: 'airgap-vpc-sovereign', model: 'google/gemma-2-9b-it' },
        },
      });'''

html = html.replace(old_app_top, new_app_top)

# Update App useEffect to fetch /api/dataset
old_app_useeffect = '''      useEffect(() => {
        fetch(`/api/session/${sessionId}`)'''

new_app_useeffect = '''      useEffect(() => {
        fetch('/api/dataset')
          .then((res) => res.json())
          .then((data) => {
            if (data) {
              setDatasetSummary(data);
              setControls((prev) => ({
                ...prev,
                enterpriseDataEnabled: data.enabled !== undefined ? data.enabled : true,
              }));
            }
          })
          .catch((err) => console.error('Failed to load dataset info:', err));

        fetch(`/api/session/${sessionId}`)'''

html = html.replace(old_app_useeffect, new_app_useeffect)

# Update App return JSX
old_app_jsx = '''        const lastMetadata = metadataHistory[metadataHistory.length - 1];

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
        );'''

new_app_jsx = '''        const lastMetadata = metadataHistory[metadataHistory.length - 1];
        const isEnterpriseActive = controls.enterpriseDataEnabled ?? datasetSummary?.enabled ?? false;

        return (
          <div className="h-screen overflow-hidden flex flex-col bg-slate-950 font-sans text-slate-100">
            <TelemetryHeader
              lastMetadata={lastMetadata}
              buildInfo={buildInfo}
              datasetSummary={datasetSummary}
              enterpriseDataEnabled={isEnterpriseActive}
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
                enterpriseDataEnabled={isEnterpriseActive}
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
              onDatasetUpdate={(updated) => {
                setDatasetSummary(updated);
                setControls((prev) => ({ ...prev, enterpriseDataEnabled: updated.enabled }));
              }}
            />
          </div>
        );'''

html = html.replace(old_app_jsx, new_app_jsx)

with open("src/backend/static/index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Updated index.html headers, ChaosPanel, ChatWindow, and App successfully.")
