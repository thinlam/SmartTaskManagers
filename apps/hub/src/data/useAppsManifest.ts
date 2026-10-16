import { useEffect, useState } from 'react';
import { DEFAULT_APPS, type AppEntry } from './apps';

/**
 * Raw file in the repo root, fetched fresh on every Hub launch — this is
 * what lets an app's "Cập nhật" button appear without ever rebuilding or
 * redistributing Hub itself: only this JSON file needs to change.
 * raw.githubusercontent.com matches the *.githubusercontent.com entry
 * already allowed in src-tauri/capabilities/default.json.
 */
const MANIFEST_URL =
  'https://raw.githubusercontent.com/thinlam/SmartTaskManagers/main/apps-manifest.json';

interface ManifestFile {
  apps: AppEntry[];
}

function isManifestFile(value: unknown): value is ManifestFile {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as ManifestFile).apps)
  );
}

export interface AppsManifestState {
  apps: AppEntry[];
  /** 'remote' once the live manifest loaded; 'default' while using the bundled fallback. */
  source: 'remote' | 'default';
}

/**
 * Loads the app catalog from MANIFEST_URL, falling back to the bundled
 * DEFAULT_APPS (offline, network error, or malformed response) so the
 * Hub UI always has something to render.
 */
export function useAppsManifest(): AppsManifestState {
  const [state, setState] = useState<AppsManifestState>({
    apps: DEFAULT_APPS,
    source: 'default',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(MANIFEST_URL, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: unknown = await response.json();
        if (!isManifestFile(data)) throw new Error('malformed manifest');
        if (!cancelled) setState({ apps: data.apps, source: 'remote' });
      } catch (err) {
        console.error('[useAppsManifest] falling back to bundled apps:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
