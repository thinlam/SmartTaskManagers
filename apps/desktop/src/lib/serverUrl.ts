import { API_BASE_URL } from '../config/api';

/**
 * Backend base URL — configurable at runtime, not fixed to whatever
 * `VITE_API_BASE_URL` was at build time (`config/api.ts`). Needed
 * because a single build of this installer is meant to run on multiple
 * machines that all talk to one shared backend over the LAN — each
 * machine's user enters that backend's address once, on the login
 * screen, and it's remembered from then on (see LoginPage.tsx).
 *
 * `API_BASE_URL` (from config/api.ts, itself required and validated at
 * import time — see that file) is only ever the *default* here, used
 * until the user explicitly overrides it. There's no separate
 * hard-coded literal in this file — if `API_BASE_URL` is missing, the
 * app already failed to start, per config/api.ts's own doc comment.
 */
const STORAGE_KEY = 'stm.serverUrl';

export function getStoredServerUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || API_BASE_URL;
  } catch {
    return API_BASE_URL;
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
