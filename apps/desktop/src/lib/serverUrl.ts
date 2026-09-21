/**
 * Backend base URL — configurable at runtime, not baked into the build
 * (VITE_API_URL, Phase 27, only ever set it once at build time). Needed
 * because a single build of this installer is meant to run on multiple
 * machines that all talk to one shared backend over the LAN — each
 * machine's user enters that backend's address once, on the login
 * screen, and it's remembered from then on (see LoginPage.tsx).
 */
const STORAGE_KEY = 'stm.serverUrl';
const DEFAULT_URL = 'http://localhost:5277';

export function getStoredServerUrl(): string {
  try {
    return (
      localStorage.getItem(STORAGE_KEY) || (import.meta.env.VITE_API_URL as string) || DEFAULT_URL
    );
  } catch {
    return DEFAULT_URL;
  }
}

export function setStoredServerUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, url);
  } catch {
    // localStorage unavailable (e.g. private mode) — the value just
    // won't persist across restarts; configureApiClient() still applies
    // for the current session.
  }
}
