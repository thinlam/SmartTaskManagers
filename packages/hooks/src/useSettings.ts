import { useCallback, useState } from 'react';
import type { Settings } from '@stm/types';

export interface UseSettingsResult {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
}

/**
 * Local settings store (Phase 19) — a single object, not a list, so the
 * shape is simpler than useTasks/useProjects/useGoals/useHabits: no
 * add/delete, just `settings` + `updateSettings(patch)`. Same tradeoff as
 * the rest: mutates React state only, no @stm/api-client call, no
 * persistence until Phase 27.
 */
export function useSettings(initialSettings: Settings): UseSettingsResult {
  const [settings, setSettings] = useState<Settings>(initialSettings);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((previous) => ({ ...previous, ...patch }));
  }, []);

  return { settings, updateSettings };
}
