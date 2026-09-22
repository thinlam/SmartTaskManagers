# Phase 33 — Web Deployment (`apps/web`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract `apps/desktop`'s shared React code into a new `packages/app-core` package, scaffold a new `apps/web` Vite app on top of it, make backend CORS config-driven, and verify both apps build/run for real — so a Vercel deploy of `apps/web` is possible without duplicating any UI/business logic.

**Architecture:** `packages/app-core` becomes the single source of truth for pages/components/state/routing/config (everything in `apps/desktop/src` except the Tauri-facing bootstrap). `apps/desktop` and `apps/web` each keep only `main.tsx`/`index.css`/`vite-env.d.ts`/build config, importing `App` from `@stm/app-core`. Backend CORS switches from a hard-coded origin array to `Cors:AllowedOrigins` config, so a future Vercel domain is one env var away, not a code change.

**Tech Stack:** React 19, Vite 6, TypeScript 5, Tailwind v4, react-router-dom 7, npm workspaces, ASP.NET Core 10 / EF Core 10 (backend, config-only change).

**Spec:** `docs/superpowers/specs/2026-09-22-phase33-web-deployment-design.md`

## Global Constraints

- Do not change `apps/desktop`'s runtime behavior — it must build and run identically after the extraction (no regression).
- Do not change backend business logic, API contract, or auth/JWT flow — CORS config is the only backend change.
- No hard-coded Vercel/production domain anywhere in source — CORS origins and API base URL both come from config/env, matching the existing `config/api.ts` fail-fast convention.
- This repo has no unit test suite (`dotnet test` finds no test projects; frontend has no test runner configured) — verification follows the project's existing convention seen throughout `docs/roadmap/ROADMAP.md`: real `typecheck`/`lint`/`build` runs, real `curl`, and real browser click-testing where a browser-automation tool is available. Every task's verification step must be a real command run with real output checked, never an assumption.
- All commit messages end with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Document every change in Vietnamese in `docs/roadmap/ROADMAP.md` (append, following the existing "Phase N đã thực hiện" narrative style) and in the relevant package/app READMEs, per this project's established convention.

---

### Task 1: Extract shared code into `packages/app-core`

**Files:**
- Create: `packages/app-core/package.json`
- Create: `packages/app-core/tsconfig.json`
- Create: `packages/app-core/src/index.ts`
- Create: `packages/app-core/src/vite-env.d.ts`
- Move (via `git mv`, preserving history): `apps/desktop/src/app/` → `packages/app-core/src/app/`
- Move: `apps/desktop/src/components/` → `packages/app-core/src/components/`
- Move: `apps/desktop/src/pages/` → `packages/app-core/src/pages/`
- Move: `apps/desktop/src/state/` → `packages/app-core/src/state/`
- Move: `apps/desktop/src/config/` → `packages/app-core/src/config/`
- Move: `apps/desktop/src/lib/` → `packages/app-core/src/lib/`
- Move: `apps/desktop/src/mock/` → `packages/app-core/src/mock/`
- Move: `apps/desktop/src/App.tsx` → `packages/app-core/src/App.tsx`
- Modify: root `tsconfig.json` (add `packages/app-core` reference, mirroring how `packages/ui`/`packages/shared` are already referenced)

**Interfaces:**
- Consumes: `@stm/ui`, `@stm/types`, `@stm/hooks`, `@stm/shared`, `@stm/api-client` (all already-published workspace packages, unchanged).
- Produces: `@stm/app-core` package exporting `App` (default export of `App.tsx`, re-exported named from `src/index.ts`) — this is what Task 2 and Task 4 both import.

None of the moved files' internal imports change — they're all relative imports within the moved subtree (e.g. `pages/Dashboard/DashboardPage.tsx` importing `../../state/TasksContext`), and `git mv` preserves relative structure exactly. Only cross-package imports (`@stm/ui`, `@stm/api-client`, etc.) exist, and those resolve identically once `package.json`/`tsconfig.json` are in place.

- [ ] **Step 1: Create the package directory and move files with `git mv`**

```bash
cd /e/SmartTaskManager
mkdir -p packages/app-core/src
git mv apps/desktop/src/app packages/app-core/src/app
git mv apps/desktop/src/components packages/app-core/src/components
git mv apps/desktop/src/pages packages/app-core/src/pages
git mv apps/desktop/src/state packages/app-core/src/state
git mv apps/desktop/src/config packages/app-core/src/config
git mv apps/desktop/src/lib packages/app-core/src/lib
git mv apps/desktop/src/mock packages/app-core/src/mock
git mv apps/desktop/src/App.tsx packages/app-core/src/App.tsx
```

- [ ] **Step 2: Write `packages/app-core/package.json`**

```json
{
  "name": "@stm/app-core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc -b --pretty"
  },
  "dependencies": {
    "@stm/api-client": "*",
    "@stm/hooks": "*",
    "@stm/shared": "*",
    "@stm/types": "*",
    "@stm/ui": "*",
    "lucide-react": "^1.47.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.18.4"
  },
  "devDependencies": {
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 3: Write `packages/app-core/tsconfig.json`**

```json
{
  "extends": "../config/tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "types": ["vite/client"]
  },
  "include": ["src"],
  "references": [
    { "path": "../ui" },
    { "path": "../types" },
    { "path": "../hooks" },
    { "path": "../shared" },
    { "path": "../api-client" }
  ]
}
```

- [ ] **Step 4: Write `packages/app-core/src/vite-env.d.ts`**

```typescript
/// <reference types="vite/client" />
```

This is what makes `import.meta.env.VITE_API_BASE_URL` in the moved `config/api.ts` type-check inside this package (it needs its own ambient declaration — it no longer inherits `apps/desktop/src/vite-env.d.ts`, which stays with `apps/desktop`).

- [ ] **Step 5: Write `packages/app-core/src/index.ts`**

```typescript
export { default as App } from './App';
export { getStoredServerUrl } from './lib/serverUrl';
```

**Ruling (preflight scan, controller):** the original plan draft deferred this `getStoredServerUrl` re-export to Task 4 Step 1, but `apps/desktop/src/main.tsx` imports it directly from `./lib/serverUrl` — a path Step 1 of this task just `git mv`'d away. Leaving the re-export out until Task 4 means Task 2's own `npm run typecheck` verification step (Task 2 Step 5) would fail on a dangling import before Task 4 ever runs. Both exports are added here, in Task 1, so Task 2 can fix both imports at once and its typecheck step actually passes. Task 4 Step 1 below is a no-op check now (the export already exists) — keep it only as a re-confirmation, not a new addition.

- [ ] **Step 6: Add `packages/app-core` to the root `tsconfig.json`'s references**

Read `E:\SmartTaskManager\tsconfig.json` first, then add `{ "path": "packages/app-core" }` to its `references` array (alongside the existing `packages/ui`/`packages/types`/etc. entries — match their exact format).

- [ ] **Step 7: Verify the package typechecks standalone**

Run: `cd /e/SmartTaskManager && npm install && npm run typecheck --workspace=@stm/app-core`
Expected: exits 0, no errors. (This will fail until Task 2 removes `apps/desktop`'s now-dangling imports of the moved paths — if it fails only on `apps/desktop`'s side, that's expected at this point; the `@stm/app-core` project itself must report clean.)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor(app-core): extract shared React code from apps/desktop into packages/app-core

Moves app/, components/, pages/, state/, config/, lib/, mock/, and
App.tsx out of apps/desktop/src into a new @stm/app-core package via
git mv, so apps/desktop and the upcoming apps/web (Phase 33) both
consume one copy of the UI/business logic instead of duplicating it.
No import paths inside the moved files change — they're all relative
within the moved subtree.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Update `apps/desktop` to consume `@stm/app-core`

**Files:**
- Modify: `apps/desktop/src/main.tsx`
- Modify: `apps/desktop/package.json`
- Modify: `apps/desktop/tsconfig.json`

**Interfaces:**
- Consumes: `App` from `@stm/app-core` (produced by Task 1).
- Produces: nothing new — this task only rewires an existing consumer.

- [ ] **Step 1: Read the current `apps/desktop/src/main.tsx`**

Run: read the file to get its exact current content. It imports `App` from `./App` (Task 1 moved this to `@stm/app-core`) AND `getStoredServerUrl` from `./lib/serverUrl` (Task 1 moved this too, to the same package) — both imports are currently dangling and must both be fixed in the next step.

- [ ] **Step 2: Fix both dangling imports in `apps/desktop/src/main.tsx`**

Change:
```typescript
import App from './App';
```
and
```typescript
import { getStoredServerUrl } from './lib/serverUrl';
```
to a single combined import:
```typescript
import { App, getStoredServerUrl } from '@stm/app-core';
```
(`App` is a named import now, since `packages/app-core/src/index.ts` re-exports it as a named export, not a default export — this matches Task 1 Step 5 exactly. Both symbols come from the same package, so this replaces two import lines with one.)

- [ ] **Step 3: Add `@stm/app-core` as a dependency in `apps/desktop/package.json`**

Read the file first, then add `"@stm/app-core": "*"` to its `dependencies` object (alongside the existing `@stm/hooks`/`@stm/shared`/`@stm/types`/`@stm/ui` entries).

- [ ] **Step 4: Add `packages/app-core` to `apps/desktop/tsconfig.json`'s references**

Read the file first, then add `{ "path": "../../packages/app-core" }` to its `references` array.

- [ ] **Step 5: Install and typecheck**

Run: `cd /e/SmartTaskManager && npm install && npm run typecheck`
Expected: exits 0, no errors, for the whole workspace (this now validates both `@stm/app-core` and `apps/desktop` together, and confirms nothing still points at the old `./App`/`./state`/etc. paths inside `apps/desktop/src`).

- [ ] **Step 6: Verify `apps/desktop` still builds for real**

Run: `cd /e/SmartTaskManager && npm run build --workspace=apps/desktop`
Expected: exits 0, produces `apps/desktop/dist/` with no build errors — confirms the extraction didn't regress the desktop app.

- [ ] **Step 7: Run lint and format checks**

Run: `cd /e/SmartTaskManager && npm run lint && npm run format`
Expected: both exit 0. If `format` fails, run `npm run format:write` and re-check `git status` for unexpected changes before committing.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor(desktop): consume @stm/app-core instead of local App

apps/desktop/src now only contains main.tsx/index.css/vite-env.d.ts
plus Tauri/build config — all page/component/state code moved to
@stm/app-core in the previous commit. Verified apps/desktop still
typechecks, builds, lints, and formats clean after the switch.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Make backend CORS origins config-driven

**Files:**
- Modify: `backend/SmartTask.Api/Program.cs`
- Modify: `backend/SmartTask.Api/appsettings.Development.json`

**Interfaces:**
- Consumes: `builder.Configuration` (already available in `Program.cs`).
- Produces: nothing consumed by other tasks — this task is backend-only and independent of Tasks 1/2/4.

- [ ] **Step 1: Read the current CORS block in `backend/SmartTask.Api/Program.cs`**

It currently reads (see the `DesktopCorsPolicy` block, around line 122):
```csharp
const string DesktopCorsPolicy = "DesktopClient";
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        DesktopCorsPolicy,
        policy =>
            policy
                .WithOrigins("http://localhost:5173", "tauri://localhost", "http://tauri.localhost")
                .AllowAnyHeader()
                .AllowAnyMethod()
    );
});
```

- [ ] **Step 2: Replace the hard-coded origins with a config read**

```csharp
const string DesktopCorsPolicy = "DesktopClient";
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        DesktopCorsPolicy,
        policy => policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()
    );
});
```

Update the doc comment immediately above this block (currently explaining why a named policy is used) to add one sentence: origins now come from `Cors:AllowedOrigins` config instead of being hard-coded, so a production frontend domain (e.g. a Vercel deployment) can be added via the `Cors__AllowedOrigins__0` environment variable on Railway without a code change or redeploy.

- [ ] **Step 3: Add the default origins to `appsettings.Development.json`**

Read the file first, then add:
```json
"Cors": {
  "AllowedOrigins": [
    "http://localhost:5173",
    "http://localhost:5174",
    "tauri://localhost",
    "http://tauri.localhost"
  ]
}
```
(`5174` is added pre-emptively for `apps/web`'s dev server, which Vite will pick if `5173` is already taken by a running `apps/desktop` dev session — see Task 4.)

- [ ] **Step 4: Build the backend**

Run: `cd /e/SmartTaskManager/backend && dotnet build -c Release`
Expected: `Build succeeded. 0 Warning(s). 0 Error(s).`

- [ ] **Step 5: Verify CORS behavior for real with a running server**

```bash
cd /e/SmartTaskManager/backend/SmartTask.Api
dotnet bin/Release/net10.0/SmartTask.Api.dll &
sleep 3
curl -s -i -X OPTIONS http://localhost:8080/api/auth/login \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" | grep -i "access-control-allow-origin"
curl -s -i -X OPTIONS http://localhost:8080/api/auth/login \
  -H "Origin: http://evil.example.com" \
  -H "Access-Control-Request-Method: POST" | grep -i "access-control-allow-origin"
kill %1
```
Expected: the first `curl` prints `Access-Control-Allow-Origin: http://localhost:5173`; the second prints nothing (origin not in the allowed list, header omitted). Note: this requires a real `ConnectionStrings__DefaultConnection` to be set in the shell environment for the app to start — reuse whatever local MySQL connection string is already configured for `dotnet run` in this repo (see `backend/README.md`); if unavailable, run against the deployed Railway URL instead of a local instance and adjust the `curl` target accordingly, but the header check must be against a real running instance either way, not skipped.

- [ ] **Step 6: Commit**

```bash
cd /e/SmartTaskManager
git add backend/SmartTask.Api/Program.cs backend/SmartTask.Api/appsettings.Development.json
git commit -m "$(cat <<'EOF'
refactor(backend): make CORS allowed origins config-driven

Replaces the hard-coded WithOrigins(...) list in Program.cs with a
read from Cors:AllowedOrigins config. appsettings.Development.json
declares the same 3 origins plus :5174 (apps/web's dev server, Phase
33) as defaults, so local dev behavior is unchanged. Production
(Railway) can add a future Vercel domain via the
Cors__AllowedOrigins__0 environment variable with no code change or
redeploy needed.

Verified via a real running instance: OPTIONS preflight from an
allowed origin returns Access-Control-Allow-Origin; from an
unlisted origin, the header is omitted.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Scaffold `apps/web`

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/.env.development`
- Create: `apps/web/.env.production`
- Create: `apps/web/.env.example`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/index.css`
- Create: `apps/web/src/vite-env.d.ts`
- Modify: `apps/web/README.md` (replace the existing placeholder)
- Modify: root `package.json` (add to `workspaces`, add `dev:web`/`build:web` scripts)

**Interfaces:**
- Consumes: `App` and `getStoredServerUrl` from `@stm/app-core` (both already exported by Task 1 Step 5 — see the controller ruling recorded there).
- Produces: nothing consumed by other tasks — this is the final app.

- [ ] **Step 1: Confirm `@stm/app-core` already exports both symbols**

Read `packages/app-core/src/index.ts`. It should already contain both lines (written in Task 1 Step 5, per the controller ruling recorded there — the original plan draft deferred this to here, but the export was moved earlier to keep Task 2's typecheck passing):
```typescript
export { default as App } from './App';
export { getStoredServerUrl } from './lib/serverUrl';
```
If for any reason it doesn't (e.g. Task 1 was executed against an older copy of this plan), add the missing line now and re-run `npm run typecheck` from the repo root before proceeding — but this should be a no-op confirmation, not new work.

- [ ] **Step 2: Write `apps/web/package.json`**

```json
{
  "name": "@stm/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b --pretty && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --pretty"
  },
  "dependencies": {
    "@stm/app-core": "*",
    "@stm/api-client": "*",
    "@stm/hooks": "*",
    "@stm/shared": "*",
    "@stm/types": "*",
    "@stm/ui": "*",
    "lucide-react": "^1.47.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.18.4"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "tailwindcss": "^4.0.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 3: Write `apps/web/vite.config.ts`**

```typescript
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

- [ ] **Step 4: Write `apps/web/index.html`**

Read `apps/desktop/index.html` first for the exact current title/meta, then write an equivalent `apps/web/index.html` with the same `<title>` and structure, pointing `<script type="module" src="/src/main.tsx"></script>` — no Tauri-specific meta tags if any exist in the desktop version (check for and drop any `tauri://` CSP or similar before copying).

- [ ] **Step 5: Write `apps/web/tsconfig.json`**

```json
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "composite": false,
    "declaration": false,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"],
  "references": [
    { "path": "../../packages/app-core" },
    { "path": "../../packages/ui" },
    { "path": "../../packages/types" },
    { "path": "../../packages/hooks" },
    { "path": "../../packages/shared" }
  ]
}
```

- [ ] **Step 6: Write `apps/web/.env.development`**

```
VITE_API_BASE_URL=http://localhost:5277
```

- [ ] **Step 7: Write `apps/web/.env.production`**

```
VITE_API_BASE_URL=https://smarttaskmanagers-production.up.railway.app
```

- [ ] **Step 8: Write `apps/web/.env.example`**

Read `apps/desktop/.env.example` first for its exact format/comments, then write an equivalent `apps/web/.env.example` documenting `VITE_API_BASE_URL` the same way.

- [ ] **Step 9: Write `apps/web/src/main.tsx`**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configureApiClient } from '@stm/api-client';
import { App, getStoredServerUrl } from '@stm/app-core';
import './index.css';

configureApiClient({ baseUrl: getStoredServerUrl() });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 10: Write `apps/web/src/index.css`**

```css
@import 'tailwindcss';
@import '@stm/ui/theme.css';

@source '../../../packages/ui/src';
@source '../../../packages/app-core/src';

body {
  background-color: var(--color-background);
  color: var(--color-ink-primary);
  font-family: var(--font-sans);
}
```

(Note the added second `@source` line — Tailwind must also scan `packages/app-core/src` now, since that's where all the actual page/component markup lives; `apps/desktop/src/index.css` needs this exact same line added too, or its production build will silently drop every class used only inside moved pages/components. This is a required fix to `apps/desktop/src/index.css` alongside this new file — see Step 11.)

- [ ] **Step 11: Fix `apps/desktop/src/index.css`'s `@source` to also cover `app-core`**

Read `apps/desktop/src/index.css`, then add `@source '../../../packages/app-core/src';` right after the existing `@source '../../../packages/ui/src';` line. This closes a real bug the extraction would otherwise introduce silently (a production build with no Tailwind errors, but missing CSS for every class used in a moved page/component).

- [ ] **Step 12: Write `apps/web/src/vite-env.d.ts`**

```typescript
/// <reference types="vite/client" />
```

- [ ] **Step 13: Write `apps/web/README.md`**

```markdown
# Web (React)

Vite + React 19 + Tailwind v4, same stack as `apps/desktop`, sharing all
page/component/state code via `@stm/app-core` (Phase 33) — no UI or
business logic is duplicated between the two apps.

## Chạy local

\`\`\`bash
npm run dev --workspace=apps/web
\`\`\`

Mặc định gọi backend tại `http://localhost:5277` (xem `.env.development`).
Nếu `apps/desktop` đang chạy dev server cùng lúc và chiếm cổng `5173`, Vite
sẽ tự chuyển `apps/web` sang `5174` — cổng này đã được thêm sẵn vào CORS
`Cors:AllowedOrigins` phía backend (`appsettings.Development.json`).

## Build

\`\`\`bash
npm run build --workspace=apps/web
\`\`\`

## Deploy lên Vercel

1. Kết nối repo GitHub với Vercel, tạo project mới.
2. Trong Project Settings → General → Root Directory, chọn `apps/web`.
3. Build Command: `cd ../.. && npm install && npm run build --workspace=apps/web`
   Output Directory: `dist`
   (Vercel tự nhận diện Vite qua `vite.config.ts` nếu Root Directory đúng;
   chỉ cần chỉnh Build Command thủ công vì đây là npm workspaces monorepo.)
4. Environment Variables → thêm `VITE_API_BASE_URL` = URL backend Railway
   thật (giá trị giống `.env.production` ở đây).
5. Sau khi deploy xong và có domain thật (vd. `https://smarttask.vercel.app`),
   thêm domain đó vào biến môi trường `Cors__AllowedOrigins__0` trên Railway
   (service `SmartTaskManagers`) — không cần sửa code hay deploy lại backend.
```

- [ ] **Step 14: Add `apps/web` to root `package.json`**

Read `E:\SmartTaskManager\package.json` first, then:
- Add `"apps/web"` to the `workspaces` array.
- Add scripts: `"dev:web": "npm run dev --workspace=apps/web"` and `"build:web": "npm run build --workspace=apps/web"` (placed next to the existing `dev:desktop`/`build:desktop` entries).

- [ ] **Step 15: Install dependencies**

Run: `cd /e/SmartTaskManager && npm install`
Expected: exits 0, `apps/web` now shows up under `node_modules/.bin` symlinks / workspace resolution (confirm with `npm ls --workspace=apps/web @stm/app-core` showing the local workspace link).

- [ ] **Step 16: Typecheck the whole repo**

Run: `cd /e/SmartTaskManager && npm run typecheck`
Expected: exits 0 for every workspace including `apps/web`.

- [ ] **Step 17: Production build `apps/web`**

Run: `cd /e/SmartTaskManager && npm run build --workspace=apps/web`
Expected: exits 0, produces `apps/web/dist/index.html` plus hashed JS/CSS assets, no build errors.

- [ ] **Step 18: Lint and format**

Run: `cd /e/SmartTaskManager && npm run lint && npm run format`
Expected: both exit 0.

- [ ] **Step 19: Re-verify `apps/desktop` after the `index.css` fix**

Run: `cd /e/SmartTaskManager && npm run build --workspace=apps/desktop`
Expected: exits 0 — confirms Step 11's CSS fix didn't break the existing desktop build.

- [ ] **Step 20: Commit**

```bash
cd /e/SmartTaskManager
git add apps/web apps/desktop/src/index.css apps/desktop/src/main.tsx packages/app-core/src/index.ts package.json
git commit -m "$(cat <<'EOF'
feat(web): scaffold apps/web on top of @stm/app-core

New Vite + React 19 + Tailwind v4 app, same stack as apps/desktop,
sharing every page/component/state via @stm/app-core (Task 1) instead
of duplicating UI code — Phase 33 of docs/roadmap/ROADMAP.md.

Also fixes a real bug the extraction introduced: apps/desktop/src/
index.css's Tailwind @source only scanned packages/ui/src, so classes
used exclusively inside moved pages/components (now in
packages/app-core/src) would have silently dropped out of production
CSS. Both apps/web and apps/desktop's index.css now scan
packages/app-core/src too.

Verified: npm install, typecheck, lint, format all clean repo-wide;
apps/web production build succeeds; apps/desktop production build
re-verified clean after the CSS fix.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: End-to-end verification and documentation

**Files:**
- Modify: `docs/roadmap/ROADMAP.md` (append Phase 33 entry)

**Interfaces:**
- Consumes: everything from Tasks 1–4 (this task only verifies and documents; it produces no code other consumers depend on).

- [ ] **Step 1: Start the backend for real**

```bash
cd /e/SmartTaskManager/backend/SmartTask.Api
dotnet run &
sleep 5
curl -s http://localhost:5277/health
```
Expected: `{"status":"Healthy"}`. Keep this running for the rest of this task.

- [ ] **Step 2: Start `apps/web`'s dev server for real**

```bash
cd /e/SmartTaskManager && npm run dev --workspace=apps/web &
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
```
Expected: `200` (or, if `apps/desktop` happened to also be running on `5173`, Vite will have bound `apps/web` to `5174` instead — check the `npm run dev` output for the actual port it printed and use that for the rest of this task).

- [ ] **Step 3: Check whether `claude-in-chrome` is available**

Try loading it: `ToolSearch` with query `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page`. If the tools load and a browser connects successfully, proceed to Step 4. If the extension isn't connected/available, skip to Step 5 and explicitly note in the ROADMAP.md entry (Step 6) that interactive click-testing was not possible in this session, same as prior phases — do not claim it was tested if it wasn't.

- [ ] **Step 4: Real browser click-test (only if Step 3 succeeded)**

Using the `claude-in-chrome` tools: navigate to `http://localhost:5173` (or whatever port Step 2 reported), confirm the Login page renders (not a blank screen or console error — check via `read_console_messages`), log in with a real test account against the local backend from Step 1, confirm the Dashboard page renders with real data after login, then navigate to at least 2 other pages (e.g. Tasks, Projects) confirming no console errors and visible content. Take note of any errors found — if any, fix them (likely candidates: a missed `@source` path, a broken relative import Task 1's `git mv` didn't catch) and re-verify before proceeding.

- [ ] **Step 5: Confirm no regressions in `apps/desktop`**

```bash
cd /e/SmartTaskManager && npm run build --workspace=apps/desktop
```
Expected: exits 0 (re-confirms Task 4 Step 19, run once more after all changes are in place).

- [ ] **Step 6: Stop background processes**

```bash
kill %1 %2 2>/dev/null
```
(Adjust job numbers to match whatever `dotnet run` and `npm run dev` actually landed on — check with `jobs` first.)

- [ ] **Step 7: Append the Phase 33 entry to `docs/roadmap/ROADMAP.md`**

Read the file's current end (after the Phase 32 entry) first, then append a new section in the same narrative style as the existing entries, in Vietnamese, covering: what was extracted into `@stm/app-core` and why, that `apps/web` now exists and shares 100% of UI/business logic with `apps/desktop`, the CORS config change and why (Vercel domain not yet known), the real `@source` CSS bug found and fixed during verification, what was verified for real (build/typecheck/lint/curl, and browser click-test if Step 4 ran — or the explicit limitation if it didn't), and what remains for the user to do themselves (create the Vercel project, set `VITE_API_BASE_URL` there, add the resulting domain to `Cors__AllowedOrigins` on Railway). Also update the `PHASE 33` line in the roadmap's summary table at the top of the file from no-status to `✅ DONE (...)` with a short parenthetical matching the style of neighboring entries (e.g. `✅ DONE (build+typecheck+lint sạch, browser click-test thật)` or `✅ DONE (build+typecheck+lint sạch — chưa click-test, xem ghi chú)` depending on Step 4's outcome).

- [ ] **Step 8: Commit**

```bash
cd /e/SmartTaskManager
git add docs/roadmap/ROADMAP.md
git commit -m "$(cat <<'EOF'
docs: record Phase 33 (apps/web) in ROADMAP.md

Documents the packages/app-core extraction, the new apps/web app,
the CORS config change, the real @source CSS bug found and fixed
during verification, and what verification actually covered in this
session versus what remains for the user (Vercel project setup,
Cors:AllowedOrigins update once a real domain exists).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** Section A → Task 1. Section B → Task 4. Section C → Task 3. Section D → Task 5 (self-doable verification) plus explicit hand-off notes for the Vercel-account-dependent parts, matching the spec's "Ngoài phạm vi" list.
- **Real bug caught during planning, not left implicit:** the `@source` Tailwind path gap (Task 4 Steps 10–11) — flagged explicitly as a required fix, not an afterthought, since it would otherwise silently ship broken CSS.
- **Type/name consistency checked:** `@stm/app-core`'s `src/index.ts` exports `App` (named) and `getStoredServerUrl` (named) — both `apps/desktop/src/main.tsx` (Task 2 + Task 4 Step 1) and `apps/web/src/main.tsx` (Task 4 Step 9) import them the same way, with the same names, from the same package.
- **No placeholders:** every step either shows exact file content or an exact command; the only intentionally-deferred items (Vercel dashboard clicks, real domain, Railway env var) are explicitly named as out-of-session hand-offs in the spec and repeated as such in Task 5's ROADMAP entry — not left as vague TODOs in code.
