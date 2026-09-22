import { createContext, useContext, type ReactNode } from 'react';
import { useSettings, type UseSettingsResult } from '@stm/hooks';
import { MOCK_SETTINGS } from '../mock/settings';

const SettingsContext = createContext<UseSettingsResult | null>(null);

/**
 * One shared settings store for the whole app (Phase 19) — same reason
 * as every other entity context: mounted once around the router in
 * App.tsx so any future consumer (Task creation defaults, Dashboard/
 * Today real data — both deliberately out of scope this phase) can read
 * it without needing its own instance. Simpler than TasksContext/
 * ProjectsContext/etc: Settings is a single object, so there's no
 * editingX/isDrawerOpen state to carry — SettingsPage edits it in place.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const settingsApi = useSettings(MOCK_SETTINGS);

  return <SettingsContext.Provider value={settingsApi}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext(): UseSettingsResult {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
}
