import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Phase 34 — wraps the existing `apps/web` build (React + Vite, HashRouter
 * so it works with no server behind it, same reasoning as apps/desktop's
 * Tauri setup) into native iOS/Android shells. `webDir: 'dist'` points at
 * the same production build `npm run build:web` already produces — no
 * separate mobile-specific web build exists, this is the one web app
 * running inside three different shells (browser, Tauri, Capacitor).
 */
const config: CapacitorConfig = {
  appId: 'com.smarttaskmanager.app',
  appName: 'Smart Task Manager',
  webDir: 'dist',
};

export default config;
