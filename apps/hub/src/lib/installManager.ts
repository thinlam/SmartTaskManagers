import { useCallback, useEffect, useRef, useState } from 'react';
import { homeDir, localDataDir } from '@tauri-apps/api/path';
import type { AppEntry } from '../data/apps';

export type InstallStatus =
  | { kind: 'not-installed' }
  | { kind: 'downloading'; percent: number }
  | { kind: 'installing' }
  | { kind: 'installed'; exePath: string }
  | { kind: 'update-available'; exePath: string }
  | { kind: 'error'; message: string };

export interface InstallController {
  status: InstallStatus;
  install: () => void;
  cancel: () => void;
  open: () => void;
  retry: () => void;
}

/**
 * Resolves a Windows env-var placeholder path template (e.g.
 * "%LOCALAPPDATA%\\smart-task-manager\\smart-task-manager.exe") against
 * real Tauri path APIs. Only %LOCALAPPDATA% and %USERPROFILE% are
 * supported — that covers every installPathTemplate this manifest uses.
 */
export async function resolveInstallPath(template: string): Promise<string> {
  const localAppData = await localDataDir();
  const userProfile = await homeDir();
  return template
    .replace(/%LOCALAPPDATA%/gi, localAppData.replace(/[\\/]+$/, ''))
    .replace(/%USERPROFILE%/gi, userProfile.replace(/[\\/]+$/, ''));
}

export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface StoredInstallRecord {
  version: string;
  installedAt: string;
  exePath: string;
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

const STORE_FILE = 'install-state.json';

export function useInstallState(app: AppEntry): InstallController | null {
  const platform = app.platforms.find((p) => p.installer);
  const [status, setStatus] = useState<InstallStatus>({ kind: 'not-installed' });
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const busyRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!platform?.installer || !isTauriRuntime()) return;
    let cancelled = false;
    (async () => {
      const { load } = await import('@tauri-apps/plugin-store');
      const store = await load(STORE_FILE, { autoSave: false });
      const record = await store.get<StoredInstallRecord>(app.id);
      if (cancelled) return;
      if (!record) {
        setStatus({ kind: 'not-installed' });
      } else if (record.version === platform.installer!.version) {
        setStatus({ kind: 'installed', exePath: record.exePath });
      } else {
        setStatus({ kind: 'update-available', exePath: record.exePath });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [app.id, platform]);

  const install = useCallback(() => {
    if (!platform?.installer) return;
    if (busyRef.current) return;
    busyRef.current = true;
    const installer = platform.installer;
    const downloadUrl = platform.downloadUrl;
    if (!downloadUrl) {
      busyRef.current = false;
      setStatus({ kind: 'error', message: 'Thiếu link tải cho ứng dụng này.' });
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;

    const safeSetStatus = (next: InstallStatus) => {
      if (mountedRef.current) setStatus(next);
    };

    (async () => {
      try {
        safeSetStatus({ kind: 'downloading', percent: 0 });
        const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
        const response = await tauriFetch(downloadUrl, { signal: controller.signal });
        if (!response.ok || !response.body) {
          throw new Error(`Tải thất bại (HTTP ${response.status}).`);
        }
        const total = Number(response.headers.get('content-length') ?? 0);
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.byteLength;
          safeSetStatus({
            kind: 'downloading',
            percent: total > 0 ? Math.round((received / total) * 100) : 0,
          });
        }
        const bytes = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }

        const hash = await sha256Hex(bytes.buffer);
        if (hash !== installer.sha256) {
          throw new Error('Tệp tải về bị hỏng, vui lòng thử lại.');
        }

        const { writeFile, exists } = await import('@tauri-apps/plugin-fs');
        const { appCacheDir } = await import('@tauri-apps/api/path');
        const ext = installer.installerType === 'msi' ? 'msi' : 'exe';
        const cacheDir = await appCacheDir();
        const installerPath = `${cacheDir.replace(/[\\/]+$/, '')}\\${app.id}-${installer.version}.${ext}`;
        await writeFile(installerPath, bytes);

        safeSetStatus({ kind: 'installing' });
        const { Command } = await import('@tauri-apps/plugin-shell');
        const command =
          installer.installerType === 'msi'
            ? Command.create('msiexec', ['/i', installerPath, ...installer.silentArgs])
            : Command.create(installerPath, installer.silentArgs);
        const output = await command.execute();
        if (output.code !== 0) {
          throw new Error(`Cài đặt thất bại (mã lỗi ${output.code}).`);
        }

        const exePath = await resolveInstallPath(installer.installPathTemplate);
        const installedExists = await exists(exePath);
        if (!installedExists) {
          throw new Error('Cài đặt xong nhưng không tìm thấy ứng dụng, vui lòng thử lại.');
        }

        const { load } = await import('@tauri-apps/plugin-store');
        const store = await load(STORE_FILE, { autoSave: false });
        const record: StoredInstallRecord = {
          version: installer.version,
          installedAt: new Date().toISOString(),
          exePath,
        };
        await store.set(app.id, record);
        await store.save();

        safeSetStatus({ kind: 'installed', exePath });
      } catch (err) {
        if (controller.signal.aborted) {
          safeSetStatus({ kind: 'not-installed' });
          return;
        }
        safeSetStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.',
        });
      } finally {
        abortRef.current = null;
        busyRef.current = false;
      }
    })();
  }, [app.id, platform]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const open = useCallback(() => {
    if (status.kind !== 'installed' && status.kind !== 'update-available') return;
    const exePath = status.exePath;
    (async () => {
      const { openPath } = await import('@tauri-apps/plugin-opener');
      await openPath(exePath);
    })();
  }, [status]);

  const retry = useCallback(() => {
    setStatus({ kind: 'not-installed' });
  }, []);

  if (!platform?.installer || !isTauriRuntime()) return null;

  return { status, install, cancel, open, retry };
}
