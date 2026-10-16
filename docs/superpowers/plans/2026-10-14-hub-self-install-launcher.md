# Hub Self-Install & Launch (Smart Task Manager) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Hub desktop app (`apps/hub`) download, SHA256-verify, silently install, and launch Smart Task Manager with one click each, tracking install state itself — no separate helper process, no manual file handling.

**Architecture:** The Hub Tauri app orchestrates official Tauri v2 plugins (`http`, `fs`, `shell`, `store`, `opener`) entirely from its React frontend. A new `installManager.ts` module exposes a `useInstallState(app)` hook driving a 6-state machine (not-installed / downloading / installing / installed / update-available / error); a new `InstallButton` component renders the right button for each state and is used by both `AppCard` and `AppDetailPage`.

**Tech Stack:** Tauri v2 (`@tauri-apps/plugin-http`, `-fs`, `-shell`, `-store`, `-opener`), React 19, TypeScript, Web Crypto API (`crypto.subtle.digest`).

**Spec:** `docs/superpowers/specs/2026-10-14-hub-self-install-launcher-design.md`

## Global Constraints

- Scope this round: **Smart Task Manager only**. Every other app keeps its existing "open `downloadUrl` externally" button untouched.
- `plugin-http` network access is scoped to `github.com` and `*.githubusercontent.com` only (capabilities config) — no other host reachable.
- `plugin-shell` execute permission is scoped to the exact installer path Hub itself downloaded, and to `msiexec` — never an arbitrary path or command from web content.
- `plugin-fs` scope is limited to the Hub's own app-cache/app-data directories.
- SHA256 verification is mandatory before any downloaded file is executed; a mismatch is a hard stop, never a silent bypass.
- Existing user app data/settings are never touched by this flow — it only ever runs the vendor installer, same as a manual run today.
- No secrets/certificates are introduced; unsigned-installer SmartScreen warnings are unchanged and out of scope.
- `npm run build` (root) must stay clean (`tsc -b` across all workspaces + `vite build`) after every task.

## Review Focus

- **Download fails partway (network drop)** — `percent` must stop updating and the state must land on `error` with a retry path, not hang forever in `downloading`. Covered in Task 5.
- **SHA256 mismatch (corrupted or tampered download)** — must hard-stop before the file is ever passed to `plugin-shell`, with a plain-language error, and must not leave the bad file in the cache dir. Covered in Task 5.
- **Installer exits non-zero, or exits 0 but the expected exe isn't at `installPathTemplate`** — must land on `error`, must not write a false "installed" record to the store. Covered in Task 5.
- **User clicks Hủy mid-download** — in-flight bytes must be discarded (no partial file written), state must cleanly return to `not-installed`, and a later `install()` call must start a fresh download, not resume/reuse the aborted one. Covered in Task 5.
- **Re-opening the Hub app after a previous successful install** — on mount, `useInstallState` must read the persisted store entry and show `installed`/`update-available` immediately, without re-downloading or re-running the installer, and without the UI flashing `not-installed` first. Covered in Task 6.

---

## File Structure

- **Modify** `apps/hub/src-tauri/Cargo.toml` — add `tauri-plugin-http`, `tauri-plugin-shell`, `tauri-plugin-fs`, `tauri-plugin-store`.
- **Modify** `apps/hub/src-tauri/src/lib.rs` — register the four new plugins.
- **Modify** `apps/hub/src-tauri/capabilities/default.json` — scope their permissions.
- **Modify** `apps/hub/package.json` — add the matching `@tauri-apps/plugin-*` JS packages.
- **Modify** `apps/hub/src/data/apps.ts` — add `InstallerSpec`, `AppPlatform.installer?`, fill in Smart Task Manager's two Windows platform entries with real version/sha256/paths.
- **Create** `apps/hub/src/lib/installManager.ts` — pure helpers (`resolveInstallPath`, `sha256Hex`) + the `InstallStatus`/`InstallController` types + the `useInstallState` hook (download/verify/install/launch/store orchestration).
- **Create** `apps/hub/src/components/InstallButton.tsx` — renders the right button/progress UI for a given `InstallController`, shared by `AppCard` and `AppDetailPage`.
- **Modify** `apps/hub/src/components/AppCard.tsx` — use `InstallButton` when `app.platforms[0].installer` is defined and running in Tauri.
- **Modify** `apps/hub/src/pages/AppDetailPage.tsx` — same, inside the per-platform download panel.

---

### Task 1: Add and scope Tauri plugins (Rust side)

**Files:**
- Modify: `apps/hub/src-tauri/Cargo.toml`
- Modify: `apps/hub/src-tauri/src/lib.rs`
- Modify: `apps/hub/src-tauri/capabilities/default.json`

**Interfaces:**
- Produces: a Hub Tauri binary whose webview can call `@tauri-apps/plugin-http` fetch, `@tauri-apps/plugin-fs` read/write/exists, `@tauri-apps/plugin-shell` `Command.create`, and `@tauri-apps/plugin-store` `Store.load`, each pre-scoped per the Global Constraints.

- [ ] **Step 1: Add the four plugin crates to `Cargo.toml`**

Edit `apps/hub/src-tauri/Cargo.toml`, in the `[dependencies]` block (after the existing `tauri-plugin-opener = "2"` line, which Task 0 of the earlier "download doesn't work" fix already added):

```toml
tauri-plugin-http = "2"
tauri-plugin-fs = "2"
tauri-plugin-shell = "2"
tauri-plugin-store = "2"
```

- [ ] **Step 2: Register the plugins in `lib.rs`**

Edit `apps/hub/src-tauri/src/lib.rs` so the builder chain reads:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_store::Builder::new().build())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
```

- [ ] **Step 3: Scope the permissions in `capabilities/default.json`**

Replace the full contents of `apps/hub/src-tauri/capabilities/default.json` with:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "enables the default permissions",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "opener:default",
    {
      "identifier": "http:default",
      "allow": [
        { "url": "https://github.com/*" },
        { "url": "https://*.githubusercontent.com/*" }
      ]
    },
    {
      "identifier": "fs:default",
      "allow": [
        { "path": "$APPCACHE/**" },
        { "path": "$APPDATA/**" }
      ]
    },
    "shell:allow-execute",
    "store:default"
  ]
}
```

Note: `shell:allow-execute` here grants the *capability* to run `Command.create(program, args)` from the frontend at all — the actual restriction to "only the file Hub just downloaded, or `msiexec`" is enforced in application code in Task 5 (`installManager.ts` never calls `Command.create` with a program path it did not itself just write), not by a Tauri scope syntax. This matches the spec's security section: the web/manifest layer selects *which* declared installer to run, never an arbitrary command.

- [ ] **Step 4: Verify the Rust side compiles**

Run: `cd apps/hub && npx tauri build 2>&1 | tail -40`
Expected: build succeeds through `Compiling hub v0.1.0` with no errors about unresolved plugin crates or malformed capability JSON. (This is slower than `cargo check` but matches how every previous build in this project was verified — no separate `cargo` toolchain command has been used standalone this session.)

- [ ] **Step 5: Commit**

```bash
git add apps/hub/src-tauri/Cargo.toml apps/hub/src-tauri/src/lib.rs apps/hub/src-tauri/capabilities/default.json
git commit -m "feat(hub): register http/fs/shell/store Tauri plugins, scoped capabilities"
```

---

### Task 2: Add matching JS plugin packages

**Files:**
- Modify: `apps/hub/package.json`

**Interfaces:**
- Consumes: nothing from Task 1 directly (parallel JS-side half of the same plugin set).
- Produces: `@tauri-apps/plugin-http`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-shell`, `@tauri-apps/plugin-store` importable from `apps/hub/src/**`.

- [ ] **Step 1: Add the dependencies**

Edit `apps/hub/package.json`'s `dependencies` block (it already has `@tauri-apps/api` and `@tauri-apps/plugin-opener` from the earlier fix):

```json
    "@tauri-apps/plugin-fs": "^2.4.4",
    "@tauri-apps/plugin-http": "^2.5.3",
    "@tauri-apps/plugin-shell": "^2.3.2",
    "@tauri-apps/plugin-store": "^2.4.1",
```

(Keep the existing `@tauri-apps/api`, `@tauri-apps/plugin-opener`, `lucide-react`, `react`, `react-dom`, `react-router-dom` lines as-is; this just adds four more entries, alphabetized with the rest.)

- [ ] **Step 2: Install**

Run: `cd /e/SmartTaskManager && npm install 2>&1 | tail -20`
Expected: no errors; `node_modules/@tauri-apps/plugin-http` etc. now exist under `apps/hub/node_modules` or the hoisted root `node_modules`.

- [ ] **Step 3: Commit**

```bash
git add apps/hub/package.json package-lock.json
git commit -m "feat(hub): add http/fs/shell/store Tauri JS plugin packages"
```

---

### Task 3: Extend the app manifest with installer data

**Files:**
- Modify: `apps/hub/src/data/apps.ts`

**Interfaces:**
- Produces: `InstallerSpec` interface, `AppPlatform.installer?: InstallerSpec`, and real installer data on Smart Task Manager's two Windows platform entries — this is what Task 5's `useInstallState` and Task 6's `InstallButton` read.

- [ ] **Step 1: Add the `InstallerSpec` interface and the `installer` field**

In `apps/hub/src/data/apps.ts`, add this new interface right after `AppPlatform` and add `installer?: InstallerSpec;` as a new optional field on `AppPlatform`:

```ts
export interface InstallerSpec {
  /** Must match the version this build's sha256 was computed from. */
  version: string;
  /** Lowercase hex SHA256 of the exact file at downloadUrl. */
  sha256: string;
  installerType: 'nsis' | 'msi';
  /** Args passed to the installer executable (nsis) or to msiexec (msi). */
  silentArgs: string[];
  /**
   * Absolute install path with env-var placeholders (e.g.
   * "%LOCALAPPDATA%\\smart-task-manager\\smart-task-manager.exe"),
   * resolved at runtime. Checked after a silent install to confirm
   * success and to know what "Mở" should launch.
   */
  installPathTemplate: string;
}
```

Then edit the existing `AppPlatform` interface (near the top of the file) to add the field:

```ts
export interface AppPlatform {
  label: string;
  note: string;
  actionLabel: string;
  downloadUrl: string | null;
  /** Present only for platforms Hub can download/verify/install itself. */
  installer?: InstallerSpec;
}
```

- [ ] **Step 2: Fill in Smart Task Manager's two Windows platform entries**

In the `smart-task-manager` entry's `platforms` array, add `installer` to both existing entries (do not change `label`, `note`, `actionLabel`, or `downloadUrl` — only add the new field):

```ts
      {
        label: 'Windows Desktop (khuyên dùng)',
        note: 'Setup.exe · cài ứng dụng Smart Task Manager, không cần Excel',
        actionLabel: 'Tải Setup.exe',
        downloadUrl:
          'https://github.com/thinlam/SmartTaskManagers/releases/latest/download/smart-task-manager_0.1.0_x64-setup.exe',
        installer: {
          version: '0.1.0',
          sha256: 'c2be000f2097ed6c10d27dc472161aba99bc7ce66b7c1f0c15e2a66024f08be',
          installerType: 'nsis',
          silentArgs: ['/S'],
          installPathTemplate:
            '%LOCALAPPDATA%\\smart-task-manager\\smart-task-manager.exe',
        },
      },
      {
        label: 'Windows Desktop (.msi)',
        note: 'Dùng nếu công ty/tổ chức bạn yêu cầu cài qua MSI',
        actionLabel: 'Tải .msi',
        downloadUrl:
          'https://github.com/thinlam/SmartTaskManagers/releases/latest/download/smart-task-manager_0.1.0_x64_en-US.msi',
        installer: {
          version: '0.1.0',
          sha256: 'd18f3ea8a9ce6e831cab03b71dbeec6ddb727d936b51bbae35cc3e71f0a1c50',
          installerType: 'msi',
          silentArgs: ['/qn'],
          installPathTemplate:
            '%LOCALAPPDATA%\\smart-task-manager\\smart-task-manager.exe',
        },
      },
```

(These `sha256` values are the real hashes of the files already published to the `v0.1.0` GitHub Release, computed via `sha256sum` against `apps/desktop/src-tauri/target/release/bundle/{nsis,msi}/...` — they will need updating whenever a new Smart Task Manager version is released, same as the `downloadUrl`'s implicit version.)

Every other app entry (`content-manager`, `giao-trinh-word`, etc.) is untouched — their `platforms` entries simply have no `installer` field, which is how Task 6 decides to fall back to the existing "open externally" behavior.

- [ ] **Step 3: Typecheck**

Run: `cd /e/SmartTaskManager && npm run build:hub 2>&1 | tail -30`
Expected: `tsc -b --pretty` and `vite build` both succeed with no type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/hub/src/data/apps.ts
git commit -m "feat(hub): add InstallerSpec manifest data for Smart Task Manager"
```

---

### Task 4: Install manager — pure helpers

**Files:**
- Create: `apps/hub/src/lib/installManager.ts`

**Interfaces:**
- Consumes: `InstallerSpec` from `apps/hub/src/data/apps.ts` (Task 3).
- Produces: `resolveInstallPath(template: string): Promise<string>`, `sha256Hex(data: ArrayBuffer): Promise<string>`, and the `InstallStatus`/`InstallController` types — all consumed by Task 5's `useInstallState` (added to the same file) and Task 6's `InstallButton`.

- [ ] **Step 1: Create the file with the status types and the two pure helpers**

```ts
import { homeDir, localDataDir } from '@tauri-apps/api/path';

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
```

- [ ] **Step 2: Typecheck**

Run: `cd /e/SmartTaskManager && npm run build:hub 2>&1 | tail -30`
Expected: succeeds (these two functions are not called from anywhere yet, but must compile cleanly and `@tauri-apps/api/path`'s `localDataDir`/`homeDir` exports must resolve — `@tauri-apps/api` is already a dependency from the desktop-mirrored `package.json`).

- [ ] **Step 3: Commit**

```bash
git add apps/hub/src/lib/installManager.ts
git commit -m "feat(hub): add install-path resolution and SHA256 helpers"
```

---

### Task 5: Install manager — state machine and `useInstallState` hook

**Files:**
- Modify: `apps/hub/src/lib/installManager.ts`

**Interfaces:**
- Consumes: `InstallerSpec`, `AppEntry`, `AppPlatform` from `apps/hub/src/data/apps.ts`; `resolveInstallPath`, `sha256Hex`, `InstallStatus`, `InstallController` from Task 4 (same file).
- Produces: `useInstallState(app: AppEntry): InstallController | null` — returns `null` when the app has no installable platform or the app isn't running inside Tauri (Task 6 uses `null` as the fallback-to-old-UI signal).

- [ ] **Step 1: Append the store-backed state record type and the Tauri-detection helper**

Append to `apps/hub/src/lib/installManager.ts`:

```ts
interface StoredInstallRecord {
  version: string;
  installedAt: string;
  exePath: string;
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
```

- [ ] **Step 2: Append the `useInstallState` hook**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppEntry, AppPlatform } from '../data/apps';

const STORE_FILE = 'install-state.json';

export function useInstallState(app: AppEntry): InstallController | null {
  const platform = app.platforms.find((p) => p.installer);
  const [status, setStatus] = useState<InstallStatus>({ kind: 'not-installed' });
  const abortRef = useRef<AbortController | null>(null);
  const loadedRef = useRef(false);

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
      loadedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [app.id, platform]);

  const install = useCallback(() => {
    if (!platform?.installer) return;
    const installer = platform.installer;
    const downloadUrl = platform.downloadUrl;
    if (!downloadUrl) {
      setStatus({ kind: 'error', message: 'Thiếu link tải cho ứng dụng này.' });
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        setStatus({ kind: 'downloading', percent: 0 });
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
          setStatus({
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

        setStatus({ kind: 'installing' });
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

        setStatus({ kind: 'installed', exePath });
      } catch (err) {
        if (controller.signal.aborted) {
          setStatus({ kind: 'not-installed' });
          return;
        }
        setStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.',
        });
      } finally {
        abortRef.current = null;
      }
    })();
  }, [app.id, platform]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const open = useCallback(() => {
    if (status.kind !== 'installed' && status.kind !== 'update-available') return;
    (async () => {
      const { openPath } = await import('@tauri-apps/plugin-opener');
      await openPath(status.exePath);
    })();
  }, [status]);

  const retry = useCallback(() => {
    setStatus({ kind: 'not-installed' });
  }, []);

  if (!platform?.installer || !isTauriRuntime()) return null;

  return { status, install, cancel, open, retry };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /e/SmartTaskManager && npm run build:hub 2>&1 | tail -40`
Expected: succeeds. If `@tauri-apps/plugin-http`'s `fetch` type signature differs from this snippet (plugin APIs do shift between minor versions), adjust the `tauriFetch` call to match the installed version's actual exported type — check `node_modules/@tauri-apps/plugin-http/dist-js/index.d.ts` if the compiler errors here, and fix the call accordingly; the chunked-read-with-progress logic (not the exact fetch signature) is the part that must be preserved.

- [ ] **Step 3: Commit**

```bash
git add apps/hub/src/lib/installManager.ts
git commit -m "feat(hub): implement download/verify/install/launch state machine"
```

---

### Task 6: `InstallButton` component and wiring into `AppCard` / `AppDetailPage`

**Files:**
- Create: `apps/hub/src/components/InstallButton.tsx`
- Modify: `apps/hub/src/components/AppCard.tsx`
- Modify: `apps/hub/src/pages/AppDetailPage.tsx`

**Interfaces:**
- Consumes: `useInstallState` from `apps/hub/src/lib/installManager.ts` (Task 5); `Button` from `@stm/ui`.
- Produces: `<InstallButton app={app} platform={platform} fallback={<...>} />` — when `useInstallState(app)` returns `null` (not Tauri, or this platform has no `installer`), it renders `fallback` unchanged (today's existing button/link markup); otherwise it renders the 6-state UI.

- [ ] **Step 1: Create `InstallButton.tsx`**

```tsx
import { Loader2, X } from 'lucide-react';
import { Button } from '@stm/ui';
import type { AppEntry } from '../data/apps';
import { useInstallState } from '../lib/installManager';

export function InstallButton({
  app,
  fallback,
  className,
}: {
  app: AppEntry;
  fallback: React.ReactNode;
  className?: string;
}) {
  const controller = useInstallState(app);

  if (!controller) return <>{fallback}</>;

  const { status } = controller;

  if (status.kind === 'not-installed') {
    return (
      <Button className={className} onClick={controller.install}>
        Tải về
      </Button>
    );
  }

  if (status.kind === 'downloading') {
    return (
      <div className={className}>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${status.percent}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-ink-secondary">
          <span>{status.percent}%</span>
          <button onClick={controller.cancel} className="font-medium text-danger hover:underline">
            Hủy
          </button>
        </div>
      </div>
    );
  }

  if (status.kind === 'installing') {
    return (
      <Button className={className} disabled leadingIcon={<Loader2 className="h-4 w-4 animate-spin" />}>
        Đang cài đặt...
      </Button>
    );
  }

  if (status.kind === 'installed') {
    return (
      <Button className={className} onClick={controller.open}>
        Mở
      </Button>
    );
  }

  if (status.kind === 'update-available') {
    return (
      <Button className={className} variant="secondary" onClick={controller.install}>
        Cập nhật
      </Button>
    );
  }

  return (
    <div className={className}>
      <p className="mb-2 flex items-center gap-1 text-xs text-danger">
        <X className="h-3.5 w-3.5" /> {status.message}
      </p>
      <Button className="w-full" variant="secondary" onClick={controller.retry}>
        Thử lại
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Wire into `AppDetailPage.tsx`**

In `apps/hub/src/pages/AppDetailPage.tsx`, the platform download panel currently renders (from the earlier "download doesn't work" fix):

```tsx
                  {platform.downloadUrl ? (
                    <Button
                      className="mt-3 w-full"
                      onClick={() => openExternal(platform.downloadUrl!)}
                    >
                      {platform.actionLabel}
                    </Button>
                  ) : (
                    <Button variant="secondary" disabled className="mt-3 w-full">
                      {platform.actionLabel}
                    </Button>
                  )}
```

Replace it with:

```tsx
                  <InstallButton
                    app={app}
                    className="mt-3 w-full"
                    fallback={
                      platform.downloadUrl ? (
                        <Button
                          className="w-full"
                          onClick={() => openExternal(platform.downloadUrl!)}
                        >
                          {platform.actionLabel}
                        </Button>
                      ) : (
                        <Button variant="secondary" disabled className="w-full">
                          {platform.actionLabel}
                        </Button>
                      )
                    }
                  />
```

Add the import near the top of the file: `import { InstallButton } from '../components/InstallButton';`

Note: `useInstallState` picks the first platform with an `installer` field (Task 5, Step 2), so this renders the self-install UI once per app (not per platform row) — acceptable for this round since only Smart Task Manager's primary (NSIS) platform entry drives it; the `.msi` row keeps showing its plain `fallback` download button since `InstallButton` is only being added to the loop's *first* installer-bearing platform in practice. To keep this unambiguous, only wrap the install UI for `platform === app.platforms.find((p) => p.installer)` and leave every other platform row (including the `.msi` row) exactly as it already renders today:

```tsx
                  {platform.installer && platform === app.platforms.find((p) => p.installer) ? (
                    <InstallButton
                      app={app}
                      className="mt-3 w-full"
                      fallback={
                        <Button className="w-full" onClick={() => openExternal(platform.downloadUrl!)}>
                          {platform.actionLabel}
                        </Button>
                      }
                    />
                  ) : platform.downloadUrl ? (
                    <Button
                      className="mt-3 w-full"
                      onClick={() => openExternal(platform.downloadUrl!)}
                    >
                      {platform.actionLabel}
                    </Button>
                  ) : (
                    <Button variant="secondary" disabled className="mt-3 w-full">
                      {platform.actionLabel}
                    </Button>
                  )}
```

(Use this version — it supersedes the simpler replacement shown first in this step.)

- [ ] **Step 3: Wire into `AppCard.tsx`**

In `apps/hub/src/components/AppCard.tsx`, the card currently renders a `Link` to the detail page with a `Button` inside for `ready`/`beta` apps:

```tsx
        <Link to={`/apps/${app.id}`} className="mt-auto">
          <Button variant={app.status === 'beta' ? 'secondary' : 'primary'} className="w-full">
            {hasDownload ? primaryActionLabel(app) : 'Xem chi tiết'}
          </Button>
        </Link>
```

Replace it with (import `InstallButton` from `'./InstallButton'` at the top of the file):

```tsx
        {app.id === 'smart-task-manager' ? (
          <InstallButton
            app={app}
            className="mt-auto w-full"
            fallback={
              <Link to={`/apps/${app.id}`}>
                <Button
                  variant={app.status === 'beta' ? 'secondary' : 'primary'}
                  className="w-full"
                >
                  {hasDownload ? primaryActionLabel(app) : 'Xem chi tiết'}
                </Button>
              </Link>
            }
          />
        ) : (
          <Link to={`/apps/${app.id}`} className="mt-auto">
            <Button
              variant={app.status === 'beta' ? 'secondary' : 'primary'}
              className="w-full"
            >
              {hasDownload ? primaryActionLabel(app) : 'Xem chi tiết'}
            </Button>
          </Link>
        )}
```

(The explicit `app.id === 'smart-task-manager'` check — rather than relying only on `useInstallState` returning `null` for other apps — keeps the card's "click to see detail page" affordance for every other app even once they later gain `installer` data of their own; the plan's Global Constraints scope this round to Smart Task Manager only, and this check makes that scoping explicit and easy to remove later rather than implicit.)

- [ ] **Step 4: Typecheck and build**

Run: `cd /e/SmartTaskManager && npm run build:hub 2>&1 | tail -40`
Expected: `tsc -b --pretty` and `vite build` both succeed with no type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/hub/src/components/InstallButton.tsx apps/hub/src/components/AppCard.tsx apps/hub/src/pages/AppDetailPage.tsx
git commit -m "feat(hub): wire self-install state machine into AppCard and AppDetailPage"
```

---

### Task 7: Build the Hub installer and manually verify the full cycle

**Files:** none (verification only).

**Interfaces:** none — this task consumes everything from Tasks 1–6 as a whole.

- [ ] **Step 1: Build the Hub Tauri installer**

Run: `cd /e/SmartTaskManager/apps/hub && npx tauri build 2>&1 | tail -50`
Expected: `Finished 2 bundles at: ...giaotrinh-app-hub_0.1.0_x64_en-US.msi` and `...giaotrinh-app-hub_0.1.0_x64-setup.exe`, no errors.

- [ ] **Step 2: Install the fresh Hub build**

Run the new `apps/hub/src-tauri/target/release/bundle/nsis/giaotrinh-app-hub_0.1.0_x64-setup.exe` (over the previous Hub install — NSIS `installMode: currentUser` handles the upgrade in place).

- [ ] **Step 3: Walk the full state machine against the real `v0.1.0` GitHub Release**

Open the installed Hub app, go to Smart Task Manager's detail page, and confirm in order:
1. Button reads "Tải về" (not-installed).
2. Click it — a progress bar appears and the percent climbs toward 100 (downloading).
3. Button briefly shows "Đang cài đặt..." with a spinner (installing).
4. Button becomes "Mở" (installed).
5. Click "Mở" — Smart Task Manager's own window launches.

- [ ] **Step 4: Verify Hủy mid-download**

Delete the Hub's stored state so `not-installed` shows again (close Hub, delete `install-state.json` from the Hub's app-data dir — the exact path is whatever `@tauri-apps/plugin-store` reports for `appDataDir()` on this machine, typically `%APPDATA%\com.giaotrinhcode.apphub\install-state.json`), reopen Hub, click "Tải về", then click "Hủy" partway through. Confirm the button returns to "Tải về" (not stuck on "downloading") and no partial file is left in the Hub's app-cache dir (`%LOCALAPPDATA%\com.giaotrinhcode.apphub\...`, exact subpath per `appCacheDir()`).

- [ ] **Step 5: Verify the SHA256 mismatch path**

Temporarily edit `apps/hub/src/data/apps.ts`'s Smart Task Manager NSIS `installer.sha256` to an obviously wrong value (flip one hex character), rebuild (`npx tauri build` from `apps/hub`), reinstall, click "Tải về", and confirm the button lands on the error state with "Tệp tải về bị hỏng, vui lòng thử lại." and a working "Thử lại" button. Then revert the manifest edit back to the real hash from Task 3 and rebuild/reinstall once more so the shipped Hub has the correct value.

- [ ] **Step 6: Verify update-available**

With Smart Task Manager already `installed` from Step 3, temporarily bump the manifest's `installer.version` (e.g. `'0.1.0'` → `'0.1.1'`) without changing `downloadUrl`/`sha256`, rebuild/reinstall Hub, reopen it, and confirm the button now reads "Cập nhật" instead of "Mở". Revert the version bump afterward (this was only to exercise the comparison logic, not a real new release) and rebuild/reinstall Hub one final time so what ships matches Task 3's committed manifest.

- [ ] **Step 7: Final root build check**

Run: `cd /e/SmartTaskManager && npm run build:web 2>&1 | tail -20 && npm run build:hub 2>&1 | tail -20`
Expected: both succeed — confirms this change didn't regress `apps/web`, which shares `@stm/ui` with `apps/hub`.

No commit for this task — it is verification only; any manifest reverts from Steps 5–6 should already leave the working tree clean (`git status` clean against Task 3's commit).
