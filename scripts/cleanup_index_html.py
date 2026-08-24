# Copyright 2026 Google LLC. All Rights Reserved.
# Script to clean up and validate src/backend/static/index.html
with open("src/backend/static/index.html", "r", encoding="utf-8") as f:
    html = f.read()

# Fix duplicated state declarations in App
duplicate_state = '''      const [activeArchitectureModal, setActiveArchitectureModal] = useState(null);
      const [settingsInitialTab, setSettingsInitialTab] = useState(undefined);
      const [architectureDescriptions, setArchitectureDescriptions] = useState(() => {
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
      const [activeArchitectureModal, setActiveArchitectureModal] = useState(null);'''

clean_state = '''      const [activeArchitectureModal, setActiveArchitectureModal] = useState(null);'''

html = html.replace(duplicate_state, clean_state)

# Fix duplicated models fetch in App
duplicate_fetch = '''            if (data.architectureDescriptions) {
              setArchitectureDescriptions((prev) => ({
                ...prev,
                ...data.architectureDescriptions,
              }));
            }
            if (data.architectureDescriptions) {
              setArchitectureDescriptions((prev) => ({
                ...prev,
                ...data.architectureDescriptions,
              }));
            }'''

clean_fetch = '''            if (data.architectureDescriptions) {
              setArchitectureDescriptions((prev) => ({
                ...prev,
                ...data.architectureDescriptions,
              }));
            }'''

html = html.replace(duplicate_fetch, clean_fetch)

# Fix duplicated handlers in App
duplicate_handlers = '''      const handleSaveArchitectureDescriptions = async (updated) => {
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

      const handleOpenSettings = (tab) => {
        setSettingsInitialTab(tab || 'tiers');
        setIsSettingsOpen(true);
      };

      const handleSaveArchitectureDescriptions = async (updated) => {
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

      const handleOpenSettings = (tab) => {
        setSettingsInitialTab(tab || 'tiers');
        setIsSettingsOpen(true);
      };'''

clean_handlers = '''      const handleSaveArchitectureDescriptions = async (updated) => {
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

      const handleOpenSettings = (tab) => {
        setSettingsInitialTab(tab || 'tiers');
        setIsSettingsOpen(true);
      };'''

html = html.replace(duplicate_handlers, clean_handlers)

with open("src/backend/static/index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Cleaned up App duplicates in index.html!")
