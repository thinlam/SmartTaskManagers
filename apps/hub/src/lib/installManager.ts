import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppEntry } from '../data/apps';

export type InstallStatus =
  | { kind: 'not-installed' }
  | { kind: 'downloading'; percent: number }
  | { kind: 'installing' }
  | { kind: 'uninstalling' }
  | { kind: 'installed'; exePath: string }
  | { kind: 'update-available'; exePath: string }
  | { kind: 'error'; message: string };

export interface InstallController {
  status: InstallStatus;
  install: () => void;
  cancel: () => void;
  open: () => void;
  uninstall: () => void;
  retry: () => void;
}

/**
 * Resolves where the installer actually put the app by reading the real
 * target of the Start Menu shortcut NSIS just created — not by computing
 * %LOCALAPPDATA%\<app> ourselves, which can disagree with where NSIS's
 * own install-directory logic actually wrote the files.
 */
export async function resolveInstalledExePath(startMenuShortcut: string): Promise<string> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string>('resolve_shortcut_target', { relativePath: startMenuShortcut });
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

        const { writeFile } = await import('@tauri-apps/plugin-fs');
        const { appCacheDir } = await import('@tauri-apps/api/path');
        const ext = installer.installerType === 'msi' ? 'msi' : 'exe';
        const cacheDir = await appCacheDir();
        const installerPath = `${cacheDir.replace(/[\\/]+$/, '')}\\${app.id}-${installer.version}.${ext}`;
        await writeFile(installerPath, bytes);

        safeSetStatus({ kind: 'installing' });
        const { invoke } = await import('@tauri-apps/api/core');
        const program = installer.installerType === 'msi' ? 'msiexec' : installerPath;
        const args =
          installer.installerType === 'msi'
            ? ['/i', installerPath, ...installer.silentArgs]
            : installer.silentArgs;
        const exitCode = await invoke<number>('run_installer', { program, args });
        if (exitCode !== 0) {
          throw new Error(`Cài đặt thất bại (mã lỗi ${exitCode}).`);
        }

        let exePath: string;
        try {
          exePath = await resolveInstalledExePath(installer.startMenuShortcut);
        } catch (e) {
          throw new Error(
            `Cài đặt xong nhưng không đọc được lối tắt Start Menu (${
              e instanceof Error ? e.message : String(e)
            }), vui lòng thử lại.`,
          );
        }
        const installedExists = await invoke<boolean>('path_exists', { path: exePath });
        if (!installedExists) {
          throw new Error(
            `Cài đặt xong nhưng không tìm thấy ứng dụng ở "${exePath}", vui lòng thử lại.`,
          );
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
        const rawMessage =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : JSON.stringify(err);
        console.error('[installManager] install failed:', err);
        safeSetStatus({
          kind: 'error',
          message: rawMessage || 'Đã xảy ra lỗi không xác định.',
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
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('open_installed_app', { path: exePath });
      } catch (err) {
        console.error('[installManager] open failed:', err);
        const message =
          err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
        setStatus({ kind: 'error', message: `Không mở được ứng dụng: ${message}` });
      }
    })();
  }, [status]);

  const uninstall = useCallback(() => {
    if (status.kind !== 'installed' && status.kind !== 'update-available') return;
    if (busyRef.current) return;
    busyRef.current = true;
    const exePath = status.exePath;
    (async () => {
      try {
        setStatus({ kind: 'uninstalling' });
        const { invoke } = await import('@tauri-apps/api/core');
        const exitCode = await invoke<number>('uninstall_app', { exePath });
        // NSIS's uninstaller copies itself to a temp dir to delete the
        // original app (can't delete its own running binary), so the
        // main process can exit 0 slightly before the file is actually
        // gone — poll instead of checking once immediately after.
        let stillExists = true;
        for (let attempt = 0; attempt < 10; attempt++) {
          stillExists = await invoke<boolean>('path_exists', { path: exePath });
          if (!stillExists) break;
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        if (stillExists) {
          throw new Error(`Gỡ cài đặt có thể chưa hoàn tất (mã ${exitCode}).`);
        }
        const { load } = await import('@tauri-apps/plugin-store');
        const store = await load(STORE_FILE, { autoSave: false });
        await store.delete(app.id);
        await store.save();
        setStatus({ kind: 'not-installed' });
      } catch (err) {
        console.error('[installManager] uninstall failed:', err);
        const message =
          err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
        setStatus({ kind: 'error', message: `Không gỡ cài đặt được: ${message}` });
      } finally {
        busyRef.current = false;
      }
    })();
  }, [status, app.id]);

  const retry = useCallback(() => {
    setStatus({ kind: 'not-installed' });
  }, []);

  if (!platform?.installer || !isTauriRuntime()) return null;

  return { status, install, cancel, open, uninstall, retry };
}
