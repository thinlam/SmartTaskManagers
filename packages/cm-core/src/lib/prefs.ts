import { useSyncExternalStore } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Prefs {
  theme: ThemeMode;
  contentsView: 'list' | 'grid';
  pageSize: 10 | 20 | 50;
  dashboardRange: 'week' | 'month';
  calendarView: 'month' | 'week' | 'list';
}

export const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  contentsView: 'list',
  pageSize: 20,
  dashboardRange: 'week',
  calendarView: 'month',
};

const KEY = 'cm.prefs';
const listeners = new Set<() => void>();

function load(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return DEFAULT_PREFS;
  }
}

// useSyncExternalStore needs a referentially stable snapshot between changes.
let current = load();

export function setPrefs(patch: Partial<Prefs>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Storage unavailable — preferences last for this session only.
  }
  applyTheme(current.theme);
  listeners.forEach((l) => l());
}

export function resetPrefs() {
  setPrefs(DEFAULT_PREFS);
}

export const getPrefs = () => current;

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}

export function applyTheme(mode: ThemeMode) {
  const dark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

/** Call once at startup; keeps "system" in sync with the OS setting. */
export function initTheme() {
  applyTheme(current.theme);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (current.theme === 'system') applyTheme('system');
  });
}
