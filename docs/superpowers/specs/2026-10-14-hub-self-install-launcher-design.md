# App Hub — Self-Install & Launch for Smart Task Manager

Date: 2026-10-14
Status: Approved for implementation planning

## Problem

The App Hub desktop app (`apps/hub`, Tauri) currently lists apps and opens
their installer download link in the system browser. The user then has to
find the file in Downloads, double-click it, click through the installer,
and separately find the app to launch it. The goal is a one-click flow:
Hub downloads, verifies, silently installs, and can launch the app
directly — no manual file handling.

## Scope

**This round: Smart Task Manager only.** Its platform entry in
`apps/hub/src/data/apps.ts` gets the new self-install fields; all other
apps (Word/Excel Add-in, etc.) keep today's "open download link
externally" behavior unchanged until they have a real installer release
pipeline to describe the same way.

Out of scope for this round: a separate Helper process, a custom URL
protocol (`giaotrinh-hub://...`), and a localhost HTTP/SSE server. The
Hub Tauri app does the work itself via official Tauri plugins — it is
already a trusted, installed desktop process with the OS permissions it
needs.

## User-approved decisions (from brainstorming)

1. Hub itself is the "Helper" — no second install, no custom protocol.
2. "Mở" launches the installed `.exe` directly (Smart Task Manager is a
   standalone Tauri app now, not an Excel add-in — the original mockup's
   "open Excel and create a workbook" description does not apply).
3. Hub tracks install state itself in a local JSON store, keyed by the
   current OS user via Tauri's app-data directory — it does not read the
   Windows Uninstall registry (unreliable across NSIS vs MSI).
4. Hub is allowed to execute external processes, scoped strictly to (a)
   the installer file it just downloaded itself and (b) `msiexec` — never
   an arbitrary path/command supplied by web content.
5. Only Smart Task Manager gets this state machine in this round.

## Architecture

All work happens in the Hub Tauri app's frontend, orchestrating official
Tauri v2 plugins — no custom Rust commands needed:

| Step | Plugin | Notes |
|---|---|---|
| Download installer bytes | `@tauri-apps/plugin-http` | Bypasses webview CORS restrictions that would block a plain `fetch()` to GitHub's asset CDN; streams the response body to report progress. |
| Verify integrity | Web Crypto (`crypto.subtle.digest('SHA-256', ...)`) | Runs directly on the downloaded `ArrayBuffer`; no plugin needed. |
| Write installer to disk | `@tauri-apps/plugin-fs` | Writes into the Hub's app-cache directory, not a user-visible Downloads folder. |
| Run installer silently | `@tauri-apps/plugin-shell` | `Command.create()` restricted via `capabilities/default.json` scope to the exact downloaded file path and to `msiexec`. |
| Launch installed app | `@tauri-apps/plugin-opener` (already added for external links) | `openPath(exePath)` launches the installed `.exe` via the OS. |
| Persist install state | `@tauri-apps/plugin-store` | One JSON file in the Hub's app-data dir: `{ [appId]: { version, installedAt, exePath } }`. |

### Manifest additions (`apps/hub/src/data/apps.ts`)

Each `AppPlatform` entry that supports self-install gains an optional
`installer` object (undefined for every platform except Smart Task
Manager's Windows Desktop entry):

```ts
export interface InstallerSpec {
  version: string;
  sha256: string;
  installerType: 'nsis' | 'msi';
  /** Args passed to the installer/msiexec for a silent run. */
  silentArgs: string[];
  /**
   * Absolute install path with env-var placeholders
   * (e.g. "%LOCALAPPDATA%\\smart-task-manager\\smart-task-manager.exe"),
   * resolved at runtime via @tauri-apps/api/path. Checked after a
   * silent install to confirm success and to know what "Mở" should run.
   */
  installPathTemplate: string;
}
```

`AppPlatform.installer?: InstallerSpec` is added alongside the existing
`downloadUrl`. When `installer` is present and the app is running inside
Tauri (`'__TAURI_INTERNALS__' in window`), the UI uses the new state
machine. When absent, or running in the plain web build, it falls back to
today's "open link externally" button — this is also the fallback for
every app besides Smart Task Manager.

### State machine

New module `apps/hub/src/lib/installManager.ts` exposes a React hook,
`useInstallState(app: AppEntry)`, returning:

```ts
type InstallStatus =
  | { kind: 'not-installed' }
  | { kind: 'downloading'; percent: number }
  | { kind: 'installing' }
  | { kind: 'installed'; exePath: string }
  | { kind: 'update-available'; exePath: string }
  | { kind: 'error'; message: string };

interface InstallController {
  status: InstallStatus;
  install: () => void;   // also used for "Cập nhật"
  cancel: () => void;    // only meaningful while downloading
  open: () => void;      // only meaningful once installed
  retry: () => void;     // re-runs install() from not-installed
}
```

Status derivation on mount: read the store entry for this `appId`. If
none, `not-installed`. If present, compare its `version` to the
manifest's `installer.version`; equal → `installed`, older →
`update-available`. (No entry is ever written unless a real install
succeeded, so a stale/partial record never reports `installed`.)

Flow for `install()`:
1. `downloading` — stream-fetch `downloadUrl` via `plugin-http`, update
   `percent` from `(bytesReceived / contentLength)`. An `AbortController`
   backs `cancel()`; on cancel, discard buffered bytes and revert to
   `not-installed`.
2. On download completion, hash the buffer and compare to
   `installer.sha256`. Mismatch → `error` with a plain-language message
   ("Tệp tải về bị hỏng, vui lòng thử lại."), buffer discarded, nothing
   written to disk.
3. Write the verified bytes to the Hub's app-cache dir as
   `{appId}-{version}.{ext}`.
4. `installing` — run the installer via `plugin-shell`:
   - `installerType: 'nsis'` → run the downloaded `.exe` with
     `silentArgs` (`['/S']`).
   - `installerType: 'msi'` → run `msiexec` with
     `['/i', <downloaded msi path>, ...silentArgs]` (`silentArgs:
     ['/qn']`).
   Await process exit code 0.
5. Resolve `installPathTemplate` (env-var substitution via
   `@tauri-apps/api/path`) and confirm the file exists
   (`plugin-fs.exists`). Exists → write `{ version, installedAt,
   exePath }` to the store, status becomes `installed`. Missing (silent
   installer reported success but the expected file isn't there) →
   `error` with a plain message, nothing written to the store.
   Non-zero exit code → same `error` path.

`open()` calls `openPath(exePath)` from the stored state.

Existing install/update/user data is never touched by this flow — it
only ever runs the vendor-provided installer, which is responsible for
not clobbering a user's app data (same as a manual run today).

### UI changes

`AppCard` and `AppDetailPage`'s platform panel both read
`useInstallState(app)` when `app.platforms[0].installer` is defined and
running in Tauri, and render:

- `not-installed` → **Tải về** button, calls `install()`.
- `downloading` → progress bar + percent + **Hủy** button, calls
  `cancel()`.
- `installing` → spinner, "Đang cài đặt...", buttons disabled.
- `installed` → **Mở** button, calls `open()`.
- `update-available` → **Cập nhật** button, calls `install()` (same flow,
  overwrites the cached installer and store entry).
- `error` → short message + **Thử lại** button, calls `retry()`.

Every other app's card/detail panel is unchanged (still the existing
"open externally" button for `downloadUrl`).

## Security

- `plugin-http` requests are scoped (via `capabilities/default.json`) to
  the HTTPS hosts declared for downloads: `github.com`,
  `*.githubusercontent.com` (GitHub's release-asset CDN redirect target).
  No other host is reachable through this plugin.
- `plugin-shell`'s execute permission is scoped to two things only: the
  exact file path Hub itself just wrote to its own cache dir (never a
  path supplied by a web page or API response), and the fixed program
  name `msiexec`. The web/manifest layer can select *which* declared
  installer to run, never an arbitrary command or argument list beyond
  what `silentArgs` in the manifest (checked into this repo, not
  fetched at runtime) specifies.
- `plugin-fs` scope is limited to the Hub's own app-cache and app-data
  directories — no access to arbitrary filesystem paths.
- SHA256 verification is mandatory before the file is ever executed;
  a mismatch is a hard stop (`error` state), never a silent bypass.
- No secrets, certificates, or `.pfx` files are part of this change —
  installers remain unsigned (existing SmartScreen warning behavior is
  unaffected and out of scope here).

## Testing

- Manual: run `npm run build:hub-tauri`, install the resulting Hub
  build, and walk the full cycle against the real GitHub Release already
  published (`v0.1.0`): not-installed → Tải về → downloading (percent
  increases) → installing → installed → Mở (launches Smart Task
  Manager) → bump the manifest's `installer.version` locally to simulate
  `update-available` → Cập nhật.
  - Also test Hủy mid-download, and a deliberately wrong `sha256` in the
    manifest to confirm the `error` + Thử lại path.
- `npm run build` (root) must stay clean (`tsc -b` across all
  workspaces + `vite build` for hub).

## Files touched

- `apps/hub/src/data/apps.ts` — add `InstallerSpec`/`installer` field,
  fill in for Smart Task Manager's Windows Desktop platform entry.
- `apps/hub/src/lib/installManager.ts` — new: state machine + hook.
- `apps/hub/src/components/AppCard.tsx`, `apps/hub/src/pages/AppDetailPage.tsx`
  — branch on `useInstallState` when available.
- `apps/hub/src-tauri/Cargo.toml`, `capabilities/default.json` — add
  `tauri-plugin-http`, `tauri-plugin-shell`, `tauri-plugin-fs`,
  `tauri-plugin-store`; scope their permissions per the Security section.
- `apps/hub/package.json` — add `@tauri-apps/plugin-http`,
  `@tauri-apps/plugin-shell`, `@tauri-apps/plugin-fs`,
  `@tauri-apps/plugin-store`.
