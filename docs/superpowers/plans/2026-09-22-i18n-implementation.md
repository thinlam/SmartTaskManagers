# i18n (VI/EN) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every UI-chrome string in `packages/app-core` switchable between Vietnamese and English via `react-i18next`, with the choice persisted per-User on the backend.

**Architecture:** Backend adds a `Language` column to `User` plus a `PATCH /api/auth/language` endpoint; `AuthResult`/`AuthResponse`/`/me` now carry it. Frontend adds `react-i18next` to `packages/app-core`, with `vi.json`/`en.json` locale files split by namespace matching the page structure. `AuthContext` calls `i18n.changeLanguage()` on login/register/hydrate and exposes `setLanguage()` for `SettingsPage`. Every page/component under `packages/app-core/src/pages`/`components` swaps hard-coded English strings for `t('namespace.key')`.

**Tech Stack:** ASP.NET Core / EF Core (MySQL) for the backend piece; `i18next` + `react-i18next` for the frontend piece.

**Spec:** `docs/superpowers/specs/2026-09-22-i18n-design.md`

## Global Constraints

- Backend error messages stay in English — never translate anything returned from the API (per spec's "Ngoài phạm vi").
- Never translate user-entered data (task titles, notes, project names, etc.) — only UI chrome (labels, buttons, headings, static placeholders, static toasts/messages the frontend itself writes).
- Default language for a brand-new user is `"vi"`.
- `AuthResult`/`AuthResponse` only ever gain new fields in this plan — never remove or reorder existing ones (positional record parameters).
- Every change lives in `packages/app-core` (or `backend/`) — never duplicate anything into `apps/desktop` or `apps/web` directly, per Phase 33's established convention.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- This repo has no unit test suite — verification is real `dotnet build`/`npm run typecheck`/`npm run lint`/`npm run format`/`curl` runs, matching the project's established convention.

---

### Task 1: Backend — `Language` on `User` + `PATCH /api/auth/language`

**Files:**
- Modify: `backend/SmartTask.Domain/Users/User.cs`
- Modify: `backend/SmartTask.Persistence/Configurations/UserConfiguration.cs`
- Create: `backend/SmartTask.Persistence/Migrations/<timestamp>_AddUserLanguage.cs` (via `dotnet ef migrations add`, not hand-written)
- Modify: `backend/SmartTask.Application/Auth/AuthContracts.cs`
- Modify: `backend/SmartTask.Application/Auth/AuthService.cs`
- Modify: `backend/SmartTask.Application/Users/IUserRepository.cs`
- Modify: `backend/SmartTask.Persistence/Repositories/UserRepository.cs`
- Modify: `backend/SmartTask.Api/Controllers/AuthController.cs`

**Interfaces:**
- Produces: `User.Language: string` (`"vi"`/`"en"`, default `"vi"`); `AuthResult` gains a `Language` field (last positional parameter); `AuthResponse` gains a `Language` field (last positional parameter); new endpoint `PATCH /api/auth/language` with body `{ "language": "vi" | "en" }`, `[Authorize]`, returns `204 No Content` on success, `400` if `language` isn't exactly `"vi"` or `"en"`.
- These are what Task 2 (frontend `AuthContext`) reads and calls.

- [ ] **Step 1: Add `Language` to the `User` entity**

Read `backend/SmartTask.Domain/Users/User.cs` first. Add this property inside the `User` class, after `DisplayName`:

```csharp
    public string Language { get; set; } = "vi";
```

- [ ] **Step 2: Configure the column**

Read `backend/SmartTask.Persistence/Configurations/UserConfiguration.cs` first. Add this line inside `Configure`, after the `DisplayName` line:

```csharp
        builder.Property(u => u.Language).HasMaxLength(5).IsRequired();
```

- [ ] **Step 3: Generate the migration**

Run (from `backend/SmartTask.Persistence`):
```bash
dotnet ef migrations add AddUserLanguage --startup-project ../SmartTask.Api
```
Expected: creates a new migration file adding a `Language` column to `Users`, non-nullable, with the EF Core default-value convention applying `"vi"` for existing rows (EF Core applies the C# default via a migration default constraint automatically for a non-nullable `string` property with an initializer — verify the generated migration file actually contains an `AddColumn` for `Language` with a default value; if it doesn't, add `.HasDefaultValue("vi")` to the `Configure` line from Step 2 and regenerate).

- [ ] **Step 4: Add `Language` to `AuthResult`**

Read `backend/SmartTask.Application/Auth/AuthContracts.cs` first. Change:
```csharp
public sealed record AuthResult(Guid UserId, string Email, string Token, DateTimeOffset ExpiresAt);
```
to:
```csharp
public sealed record AuthResult(Guid UserId, string Email, string Token, DateTimeOffset ExpiresAt, string Language);
```

- [ ] **Step 5: Populate `Language` in `AuthService`**

Read `backend/SmartTask.Application/Auth/AuthService.cs` in full. Find every place that constructs an `AuthResult` (both `RegisterAsync` and `LoginAsync`) and add `user.Language` as the final constructor argument. Do not change any other logic in this file — `RegisterAsync` already creates the `User` with `Language` defaulting to `"vi"` via the entity's own default (Step 1), no explicit assignment needed there.

- [ ] **Step 6: Add `Language` to `AuthResponse` and wire the new endpoint**

Read `backend/SmartTask.Api/Controllers/AuthController.cs` in full. Change:
```csharp
public sealed record AuthResponse(Guid UserId, string Email, string Token, DateTimeOffset ExpiresAt);
```
to:
```csharp
public sealed record AuthResponse(Guid UserId, string Email, string Token, DateTimeOffset ExpiresAt, string Language);
```
Find the private `ToResponse(result)` helper (or inline mapping — read the file to see its exact current shape) and add `result.Language` as the final argument wherever `AuthResponse` is constructed from an `AuthResult`.

Update the `Me()` action — it currently returns an anonymous object with `userId`/`email`. This endpoint has no access to a full `User`/`AuthResult`, only JWT claims, so `Language` isn't available there today. Leave `Me()` unchanged for this plan (frontend doesn't call `/me` for language — `AuthContext` gets `Language` from the login/register response directly, per Task 2). Do not add a database lookup to `Me()` — out of scope.

Add a request record near the top of the file, alongside `AuthResponse`:
```csharp
public sealed record UpdateLanguageRequest(string Language);
```

Add this new action inside `AuthController`, after `Login`:
```csharp
    [Authorize]
    [HttpPatch("language")]
    public async Task<IActionResult> UpdateLanguage(
        UpdateLanguageRequest request,
        CancellationToken cancellationToken
    )
    {
        if (request.Language is not ("vi" or "en"))
        {
            return BadRequest(new { message = "Language must be 'vi' or 'en'." });
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        await authService.UpdateLanguageAsync(Guid.Parse(userId!), request.Language, cancellationToken);
        return NoContent();
    }
```

- [ ] **Step 7: Add `GetByIdAsync` to `IUserRepository` and `UpdateLanguageAsync` to the auth service**

**Ruling (preflight scan, controller):** `backend/SmartTask.Application/Users/IUserRepository.cs` was checked directly — it currently only has `GetByEmailAsync`, `AddAsync`, `SaveChangesAsync`. There is no `GetByIdAsync` and no `UpdateAsync`. The plan draft's original Step 7 assumed both existed — they don't. Fixed here: add `GetByIdAsync` to the interface (a genuinely new capability this task needs), and rely on EF Core's change-tracking for the update (no `UpdateAsync` method needed — mutating a tracked entity then calling the existing `SaveChangesAsync()` persists it, the same way `RegisterAsync` already does after `AddAsync`).

Read `backend/SmartTask.Application/Users/IUserRepository.cs` first, then add this method to the interface:
```csharp
    Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
```

Read `backend/SmartTask.Persistence/Repositories/UserRepository.cs` and implement it there, following the exact same style as `GetByEmailAsync`:
```csharp
    public Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        dbContext.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
```

Read `backend/SmartTask.Application/Auth/IAuthService.cs` (or wherever the interface lives — grep for `interface IAuthService` if the filename differs) and add this method signature:
```csharp
    Task UpdateLanguageAsync(Guid userId, string language, CancellationToken cancellationToken);
```

Read `backend/SmartTask.Application/Auth/AuthService.cs` again and implement it:
```csharp
    public async Task UpdateLanguageAsync(Guid userId, string language, CancellationToken cancellationToken)
    {
        var user = await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");
        user.Language = language;
        await userRepository.SaveChangesAsync(cancellationToken);
    }
```
(`userRepository` here is whatever the existing constructor-injected field/parameter name in this file already is for `IUserRepository` — read the file's current constructor to use the exact same name, do not introduce a second name for the same dependency.)

- [ ] **Step 8: Build and verify**

Run (from `backend/`): `dotnet build -c Release`
Expected: `Build succeeded. 0 Warning(s). 0 Error(s).`

- [ ] **Step 9: Apply the migration and verify with a real running server**

If a local MySQL instance is reachable, run `dotnet ef database update --startup-project ../SmartTask.Api` from `backend/SmartTask.Persistence`, then start the API (`dotnet run` from `backend/SmartTask.Api`) and:
```bash
curl -s -X POST http://localhost:5277/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"i18n-test@example.com","password":"Test1234!","displayName":"I18n Test"}'
```
Expected: JSON response includes `"language":"vi"`. Then:
```bash
curl -s -X PATCH http://localhost:5277/api/auth/language \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token from register response>" \
  -d '{"language":"en"}'
```
Expected: `204` (empty body). Delete the test user afterward via whatever mechanism this repo's README documents for cleaning up test data (check `backend/README.md`'s existing "Dữ liệu test đã xoá" convention).

If no local MySQL is reachable (a known constraint in this environment — see this repo's own `docs/roadmap/ROADMAP.md` Phase 33 entry for precedent), report this honestly instead of skipping: state clearly in your task report that runtime verification wasn't possible, and that only `dotnet build` was verified.

- [ ] **Step 10: Commit**

```bash
git add backend/SmartTask.Domain/Users/User.cs \
  backend/SmartTask.Persistence/Configurations/UserConfiguration.cs \
  backend/SmartTask.Persistence/Migrations \
  backend/SmartTask.Persistence/Repositories/UserRepository.cs \
  backend/SmartTask.Application/Auth \
  backend/SmartTask.Application/Users/IUserRepository.cs \
  backend/SmartTask.Api/Controllers/AuthController.cs
git commit -m "$(cat <<'EOF'
feat(backend): add per-user Language preference + PATCH /api/auth/language

Adds a Language column to User (default "vi"), returned in
AuthResult/AuthResponse from register/login, and a new
PATCH /api/auth/language endpoint to update it. Backend error
messages remain untranslated per the i18n design spec — this only
persists the frontend's language choice.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Frontend — i18n bootstrap + navigation + Login/Register (worked pattern)

**Files:**
- Modify: `packages/app-core/package.json`
- Create: `packages/app-core/src/i18n/index.ts`
- Create: `packages/app-core/src/i18n/locales/vi.json`
- Create: `packages/app-core/src/i18n/locales/en.json`
- Modify: `packages/app-core/src/App.tsx`
- Modify: `packages/app-core/src/app/AppShell.tsx`
- Modify: `packages/app-core/src/state/AuthContext.tsx`
- Modify: `packages/app-core/src/pages/Auth/LoginPage.tsx`
- Modify: `packages/app-core/src/index.ts`

**Interfaces:**
- Consumes: `AuthResult.Language`/`AuthResponse.Language` from Task 1's API responses.
- Produces: `i18n` instance (default export from `packages/app-core/src/i18n/index.ts`), `useTranslation()` available anywhere in this package; `AuthContext`'s `setLanguage(language: 'vi' | 'en'): Promise<void>` — this is what Task 3 (Settings) calls.
- This task establishes the **exact pattern** every later page-translation task (Tasks 4-9) must follow: JSON key naming, `t()` call style, namespace-per-page.

- [ ] **Step 1: Add dependencies**

Read `packages/app-core/package.json` first. Add to `dependencies`:
```json
    "i18next": "^24.2.0",
    "react-i18next": "^15.4.0",
```
(alphabetical position among the existing entries, matching the file's current style).

- [ ] **Step 2: Write `packages/app-core/src/i18n/locales/en.json`**

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "close": "Close",
    "loading": "Loading…"
  },
  "nav": {
    "dashboard": "Dashboard",
    "today": "Today",
    "inbox": "Inbox",
    "tasks": "Tasks",
    "projects": "Projects",
    "calendar": "Calendar",
    "kanban": "Kanban",
    "goals": "Goals",
    "habits": "Habits",
    "analytics": "Analytics",
    "assistant": "Smart Assistant",
    "settings": "Settings"
  },
  "auth": {
    "appName": "Smart Task",
    "signInSubtitle": "Sign in to your workspace.",
    "registerSubtitle": "Create your workspace.",
    "showServerField": "Connecting to a shared server?",
    "hideServerField": "Hide server address",
    "serverUrlLabel": "Server URL",
    "serverUrlHint": "Leave as-is if the backend runs on this same computer.",
    "displayNameLabel": "Name (optional)",
    "emailLabel": "Email",
    "passwordLabel": "Password",
    "signInButton": "Sign in",
    "registerButton": "Create account",
    "submitting": "Please wait…",
    "switchToRegister": "Don't have an account? Create one",
    "switchToLogin": "Already have an account? Sign in",
    "genericError": "Could not reach the server. Is the backend running?"
  }
}
```

- [ ] **Step 3: Write `packages/app-core/src/i18n/locales/vi.json`**

```json
{
  "common": {
    "save": "Lưu",
    "cancel": "Hủy",
    "delete": "Xóa",
    "edit": "Sửa",
    "close": "Đóng",
    "loading": "Đang tải…"
  },
  "nav": {
    "dashboard": "Tổng quan",
    "today": "Hôm nay",
    "inbox": "Hộp thư",
    "tasks": "Công việc",
    "projects": "Dự án",
    "calendar": "Lịch",
    "kanban": "Kanban",
    "goals": "Mục tiêu",
    "habits": "Thói quen",
    "analytics": "Phân tích",
    "assistant": "Trợ lý thông minh",
    "settings": "Cài đặt"
  },
  "auth": {
    "appName": "Smart Task",
    "signInSubtitle": "Đăng nhập vào không gian làm việc của bạn.",
    "registerSubtitle": "Tạo không gian làm việc của bạn.",
    "showServerField": "Kết nối tới server dùng chung?",
    "hideServerField": "Ẩn địa chỉ server",
    "serverUrlLabel": "Địa chỉ Server",
    "serverUrlHint": "Giữ nguyên nếu backend chạy trên máy này.",
    "displayNameLabel": "Tên (tùy chọn)",
    "emailLabel": "Email",
    "passwordLabel": "Mật khẩu",
    "signInButton": "Đăng nhập",
    "registerButton": "Tạo tài khoản",
    "submitting": "Đang xử lý…",
    "switchToRegister": "Chưa có tài khoản? Tạo ngay",
    "switchToLogin": "Đã có tài khoản? Đăng nhập",
    "genericError": "Không thể kết nối tới server. Backend có đang chạy không?"
  }
}
```

- [ ] **Step 4: Write `packages/app-core/src/i18n/index.ts`**

```typescript
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import vi from './locales/vi.json';

/**
 * Bundled statically at build time — only 2 languages, no runtime
 * fetch/lazy-load needed (see docs/superpowers/specs/2026-09-22-i18n-design.md).
 * AuthContext calls i18n.changeLanguage() once the user's real
 * preference is known (from the backend, or localStorage before login).
 */
void i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    vi: { translation: vi },
  },
  lng: 'vi',
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
});

export default i18next;
```

- [ ] **Step 5: Import the i18n bootstrap in `App.tsx`**

Read `packages/app-core/src/App.tsx` first. Add `import '../i18n';` as the first import line (side-effect import — runs `i18next.init()` once, before any component using `useTranslation()` renders).

- [ ] **Step 6: Export i18n utilities from the package's public surface**

Read `packages/app-core/src/index.ts` (written in an earlier phase — currently exports `App` and `getStoredServerUrl`). Add:
```typescript
export { default as i18n } from './i18n';
```

- [ ] **Step 7: Translate navigation labels in `AppShell.tsx`**

Read `packages/app-core/src/app/AppShell.tsx` in full — it builds `SidebarGroup[]` from `APP_ROUTES` (imported from `../app/routes.ts`). `routes.ts` itself is a plain data module (not a component), so it cannot call `useTranslation()` — the translation must happen where `AppShell` maps over `APP_ROUTES` to build the Sidebar's `label` prop.

Find where `AppShell` currently uses `route.label` to build the Sidebar props. Add `import { useTranslation } from 'react-i18next';` and `const { t } = useTranslation();` inside the `AppShell` component (or wherever the mapping happens), then replace `route.label` with `t(\`nav.${navKeyForPath(route.path)}\`)` — but simpler and less error-prone: since each route's `path` already uniquely identifies it, replace `label: route.label` with a direct lookup using a small local map instead of deriving a key from the path string. Add this map near the top of `AppShell.tsx`, after the imports:
```typescript
const NAV_LABEL_KEYS: Record<string, string> = {
  '/': 'nav.dashboard',
  '/today': 'nav.today',
  '/inbox': 'nav.inbox',
  '/tasks': 'nav.tasks',
  '/projects': 'nav.projects',
  '/calendar': 'nav.calendar',
  '/kanban': 'nav.kanban',
  '/goals': 'nav.goals',
  '/habits': 'nav.habits',
  '/analytics': 'nav.analytics',
  '/assistant': 'nav.assistant',
  '/settings': 'nav.settings',
};
```
Then wherever the code currently reads `route.label`, replace it with `t(NAV_LABEL_KEYS[route.path] ?? route.label)` (falls back to the English literal from `routes.ts` if a path is ever missing from the map — defensive, not expected to trigger).

- [ ] **Step 8: Translate `LoginPage.tsx` — the worked pattern**

Read `packages/app-core/src/pages/Auth/LoginPage.tsx` in full (shown above in this plan's Global Constraints exploration — reproduced here for the exact starting point). Add `import { useTranslation } from 'react-i18next';` and, inside the `LoginPage` function, `const { t } = useTranslation();`. Then replace every hard-coded English string with a `t()` call using the `auth.*` keys from Step 2/3:

| Original string | Replace with |
|---|---|
| `'Smart Task'` (h1) | `{t('auth.appName')}` |
| `mode === 'login' ? 'Sign in to your workspace.' : 'Create your workspace.'` | `mode === 'login' ? t('auth.signInSubtitle') : t('auth.registerSubtitle')` |
| `showServerField ? 'Hide server address' : 'Connecting to a shared server?'` | `showServerField ? t('auth.hideServerField') : t('auth.showServerField')` |
| `'Server URL'` (label) | `{t('auth.serverUrlLabel')}` |
| `'Leave as-is if the backend runs on this same computer.'` | `{t('auth.serverUrlHint')}` |
| `'Name (optional)'` (label) | `{t('auth.displayNameLabel')}` |
| `'Email'` (label) | `{t('auth.emailLabel')}` |
| `'Password'` (label) | `{t('auth.passwordLabel')}` |
| `'Could not reach the server. Is the backend running?'` | `t('auth.genericError')` |
| `isSubmitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'` | `isSubmitting ? t('auth.submitting') : mode === 'login' ? t('auth.signInButton') : t('auth.registerButton')` |
| `mode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Sign in'` | `mode === 'login' ? t('auth.switchToRegister') : t('auth.switchToLogin')` |

Do not change any logic, state, or JSX structure — only replace the literal string content with the `t()` calls listed above, in place.

Also, before login/register succeeds, this page needs a language to render in. Add near the top of the component, using a `useEffect` (import `useEffect` from `react` alongside the existing `useState`):
```typescript
useEffect(() => {
  const stored = localStorage.getItem('stm.language');
  if (stored === 'vi' || stored === 'en') {
    void i18n.changeLanguage(stored);
  }
}, []);
```
Add `import i18n from '../../i18n';` to this file's imports.

- [ ] **Step 9: Wire `AuthContext` to change language on login/register/hydrate, and expose `setLanguage`**

Read `packages/app-core/src/state/AuthContext.tsx` in full. Find the functions that handle `login`, `register`, and hydration-from-`localStorage` (the existing session-restore logic — read the file to find its exact current shape; do not guess function names, use what's actually there). Add `import i18n from '../i18n';` to this file's imports.

Wherever the context currently stores the result of a successful login/register response (the object with `userId`/`email`/`token`/`expiresAt` — now also carrying `language` per Task 1), add:
```typescript
void i18n.changeLanguage(result.language);
localStorage.setItem('stm.language', result.language);
```
(adapt `result` to whatever the actual local variable name is in this file).

Add a new function to the context's value object, alongside `login`/`register`/`logout`:
```typescript
async function setLanguage(language: 'vi' | 'en') {
  await httpClient.patch('/api/auth/language', { language }); // adapt to this file's actual HTTP call convention — see how login/register call @stm/api-client
  void i18n.changeLanguage(language);
  localStorage.setItem('stm.language', language);
}
```
Read how `login`/`register` in this same file actually call the backend (they use `@stm/api-client` — check the exact import and function names used, e.g. `authApi.login(...)` or similar) and use that exact same calling convention for `setLanguage`'s API call instead of inventing a generic `httpClient.patch` — match this file's established pattern precisely. If `@stm/api-client` doesn't yet have a method for `PATCH /api/auth/language`, add one there first (read `packages/api-client/src/` to find where `login`/`register`/similar auth calls live, and add a sibling function following the exact same pattern — same file, same error-handling style).

Export `setLanguage` from the context's `AuthContextValue` type/interface and from whatever the provider returns.

- [ ] **Step 10: Install, typecheck, build**

Run (from repo root): `npm install && npm run typecheck && npm run build --workspace=apps/desktop && npm run build --workspace=apps/web`
Expected: all exit 0.

- [ ] **Step 11: Run lint and format**

Run: `npm run lint && npm run format`
Expected: both exit 0.

- [ ] **Step 12: Commit**

```bash
git add packages/app-core packages/api-client
git commit -m "$(cat <<'EOF'
feat(app-core): bootstrap react-i18next, translate nav + Login/Register

Establishes the i18n pattern the remaining pages will follow:
packages/app-core/src/i18n/ (vi.json/en.json by namespace),
AppShell's Sidebar labels, and LoginPage/RegisterPage fully
translated. AuthContext now calls i18n.changeLanguage() on
login/register/hydrate and exposes setLanguage() for Settings
(Task 3) to call, persisting via the new PATCH /api/auth/language
backend endpoint.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Settings — real language switcher

**Files:**
- Modify: `packages/app-core/src/pages/Settings/SettingsPage.tsx`

**Interfaces:**
- Consumes: `setLanguage` from `useAuthContext()` (Task 2, Step 9).

- [ ] **Step 1: Read the current Language field**

Read `packages/app-core/src/pages/Settings/SettingsPage.tsx` in full (reproduced earlier in this plan's exploration — the "Language" field is currently `<input id="settings-language" type="text" value={settings.language} onChange={(event) => updateSettings({ language: event.target.value })} .../>`).

- [ ] **Step 2: Replace it with a real VI/EN select**

Add `import { useTranslation } from 'react-i18next';` and `import { useAuthContext } from '../../state/AuthContext';` to this file's imports. Inside `SettingsPage`, add:
```typescript
const { t, i18n } = useTranslation();
const { setLanguage } = useAuthContext();
```
Replace the entire Language `<input>` block with:
```tsx
<div className="flex flex-col gap-1">
  <label htmlFor="settings-language" className={labelClasses}>
    {t('settings.language')}
  </label>
  <select
    id="settings-language"
    value={i18n.language}
    onChange={(event) => void setLanguage(event.target.value as 'vi' | 'en')}
    className={fieldClasses}
  >
    <option value="vi">{t('settings.languageVi')}</option>
    <option value="en">{t('settings.languageEn')}</option>
  </select>
</div>
```
Leave every other field in this file untouched — this task only touches the Language field (full page translation is a later task, not this one; the spec only requires this field to become functional, not the whole page pretty — that's hạng mục D, out of scope here).

- [ ] **Step 3: Add the 3 new keys to both locale files**

Read `packages/app-core/src/i18n/locales/en.json` and add to the `common` object's sibling level (create a new top-level `"settings"` object if none exists yet from Task 2 — it doesn't, Task 2 only added `common`/`nav`/`auth`):
```json
  "settings": {
    "language": "Language",
    "languageVi": "Vietnamese",
    "languageEn": "English"
  }
```
Read `packages/app-core/src/i18n/locales/vi.json` and add the equivalent:
```json
  "settings": {
    "language": "Ngôn ngữ",
    "languageVi": "Tiếng Việt",
    "languageEn": "English"
  }
```
(Insert as a new top-level key in each JSON file, alongside the existing `common`/`nav`/`auth` keys — valid JSON, comma-separated.)

- [ ] **Step 4: Typecheck and build**

Run (from repo root): `npm run typecheck && npm run build --workspace=apps/web`
Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/app-core/src/pages/Settings/SettingsPage.tsx packages/app-core/src/i18n/locales
git commit -m "$(cat <<'EOF'
feat(settings): wire the Language field to real i18n + backend persistence

Replaces the free-text Language input with a VI/EN <select> bound to
i18n.language, calling AuthContext's setLanguage() (Task 2) so the
choice persists via PATCH /api/auth/language. Rest of the Settings
page is untouched — full redesign is a separate, later work item.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Translate Dashboard, Today, Inbox

**Files:**
- Modify: `packages/app-core/src/pages/Dashboard/DashboardPage.tsx`
- Modify: `packages/app-core/src/pages/Today/TodayPage.tsx`
- Modify: `packages/app-core/src/pages/Today/BestNextActionCard.tsx`
- Modify: `packages/app-core/src/pages/Today/EndOfDayReview.tsx`
- Modify: `packages/app-core/src/pages/Today/TaskListSection.tsx`
- Modify: `packages/app-core/src/pages/Inbox/InboxPage.tsx`
- Modify: `packages/app-core/src/pages/Inbox/InboxTaskRow.tsx`
- Modify: `packages/app-core/src/i18n/locales/en.json`
- Modify: `packages/app-core/src/i18n/locales/vi.json`

**Interfaces:**
- Consumes: the `t()`/`useTranslation()` pattern established in Task 2 Step 8 — same import, same call style, no new APIs.

- [ ] **Step 1: Read all 7 files listed above in full**

- [ ] **Step 2: For each file, identify every literal UI string**

A literal UI string is: JSX text content, button/label text, static headings, static placeholder text, static empty-state copy, static toast/error messages the component itself writes. It is NOT: any value read from `task.title`, `project.name`, dates formatted from data, numbers, or anything that comes from props/state holding real user/business data.

- [ ] **Step 3: Add a `dashboard` namespace to both locale files**

Add a new top-level `"dashboard"` key to `en.json` and `vi.json`, containing one entry per literal string found in `DashboardPage.tsx`, using short descriptive key names (e.g. a KPI card titled "Overdue" becomes `"dashboard.kpiOverdue": "Overdue"` / `"Quá hạn"`). Follow Task 2's exact JSON structure/formatting style.

- [ ] **Step 4: Add a `today` namespace covering `TodayPage.tsx`, `BestNextActionCard.tsx`, `EndOfDayReview.tsx`, `TaskListSection.tsx`**

Same process — one `"today"` object in each locale file, covering every literal string across these 4 files (they're all part of the Today page, share one namespace).

- [ ] **Step 5: Add an `inbox` namespace covering `InboxPage.tsx`, `InboxTaskRow.tsx`**

Same process.

- [ ] **Step 6: In each of the 7 `.tsx` files, add `useTranslation()` and replace every identified literal string with `t('<namespace>.<key>')`**

Follow Task 2 Step 8's exact pattern: `import { useTranslation } from 'react-i18next';`, `const { t } = useTranslation();` inside the component, replace strings in place, change nothing else about logic/structure/JSX layout.

- [ ] **Step 7: Typecheck, lint, format**

Run (from repo root): `npm run typecheck && npm run lint && npm run format`
Expected: all exit 0.

- [ ] **Step 8: Commit**

```bash
git add packages/app-core/src/pages/Dashboard packages/app-core/src/pages/Today packages/app-core/src/pages/Inbox packages/app-core/src/i18n/locales
git commit -m "$(cat <<'EOF'
feat(i18n): translate Dashboard, Today, Inbox pages

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Translate Tasks, Projects, Goals, Habits

**Files:**
- Modify: `packages/app-core/src/pages/Tasks/TasksPage.tsx`
- Modify: `packages/app-core/src/pages/Tasks/TaskRow.tsx`
- Modify: `packages/app-core/src/pages/Tasks/TaskFilters.tsx`
- Modify: `packages/app-core/src/pages/Projects/ProjectsPage.tsx`
- Modify: `packages/app-core/src/pages/Projects/ProjectRow.tsx`
- Modify: `packages/app-core/src/pages/Goals/GoalsPage.tsx`
- Modify: `packages/app-core/src/pages/Goals/GoalRow.tsx`
- Modify: `packages/app-core/src/pages/Habits/HabitsPage.tsx`
- Modify: `packages/app-core/src/pages/Habits/HabitRow.tsx`
- Modify: `packages/app-core/src/components/TaskDetailDrawer.tsx`
- Modify: `packages/app-core/src/components/ProjectDetailDrawer.tsx`
- Modify: `packages/app-core/src/components/GoalDetailDrawer.tsx`
- Modify: `packages/app-core/src/components/HabitDetailDrawer.tsx`
- Modify: `packages/app-core/src/components/QuickCaptureInput.tsx`
- Modify: `packages/app-core/src/i18n/locales/en.json`
- Modify: `packages/app-core/src/i18n/locales/vi.json`

**Interfaces:**
- Consumes: same `t()`/`useTranslation()` pattern as Task 2/4.

- [ ] **Step 1: Read all 14 files listed above in full**

- [ ] **Step 2: Add `tasks`, `projects`, `goals`, `habits` namespaces to both locale files**

Following Task 4's exact process: one namespace per entity area, covering every literal UI string across that entity's page + row + detail drawer (e.g. `"tasks"` covers `TasksPage.tsx` + `TaskRow.tsx` + `TaskFilters.tsx` + `TaskDetailDrawer.tsx`). `QuickCaptureInput.tsx` is shared across entities — give it its own `"quickCapture"` namespace since it's not entity-specific.

- [ ] **Step 3: In each file, add `useTranslation()` and replace every literal UI string**

Same pattern as Task 4 Step 6 — literal strings only, never data-bound values (task titles, project names, status enum values shown verbatim from data, etc. — those come from the backend/domain model and are out of scope per the spec's "không dịch dữ liệu người dùng tự nhập").

- [ ] **Step 4: Typecheck, lint, format**

Run: `npm run typecheck && npm run lint && npm run format`
Expected: all exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/app-core/src/pages/Tasks packages/app-core/src/pages/Projects packages/app-core/src/pages/Goals packages/app-core/src/pages/Habits packages/app-core/src/components packages/app-core/src/i18n/locales
git commit -m "$(cat <<'EOF'
feat(i18n): translate Tasks, Projects, Goals, Habits pages + detail drawers

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Translate Calendar, Kanban, Analytics, Smart Assistant, Placeholder

**Files:**
- Modify: `packages/app-core/src/pages/Calendar/CalendarPage.tsx`
- Modify: `packages/app-core/src/pages/Calendar/CalendarGrid.tsx`
- Modify: `packages/app-core/src/pages/Calendar/CalendarDayCell.tsx`
- Modify: `packages/app-core/src/pages/Calendar/CalendarAgenda.tsx`
- Modify: `packages/app-core/src/pages/Kanban/KanbanPage.tsx`
- Modify: `packages/app-core/src/pages/Kanban/KanbanLane.tsx`
- Modify: `packages/app-core/src/pages/Kanban/KanbanCard.tsx`
- Modify: `packages/app-core/src/pages/Analytics/AnalyticsPage.tsx`
- Modify: `packages/app-core/src/pages/Analytics/WeeklyTrendChart.tsx`
- Modify: `packages/app-core/src/pages/Assistant/SmartAssistantPage.tsx`
- Modify: `packages/app-core/src/pages/PlaceholderPage.tsx`
- Modify: `packages/app-core/src/i18n/locales/en.json`
- Modify: `packages/app-core/src/i18n/locales/vi.json`

**Interfaces:**
- Consumes: same `t()`/`useTranslation()` pattern as Task 2/4/5.

- [ ] **Step 1: Read all 11 files listed above in full**

- [ ] **Step 2: Add `calendar`, `kanban`, `analytics`, `assistant`, `placeholder` namespaces to both locale files**

Same grouping process as Task 5 — one namespace per page area, covering every literal UI string in that area's files.

- [ ] **Step 3: In each file, add `useTranslation()` and replace every literal UI string**

Same pattern, same exclusions (never data-bound values).

- [ ] **Step 4: Typecheck, lint, format**

Run: `npm run typecheck && npm run lint && npm run format`
Expected: all exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/app-core/src/pages/Calendar packages/app-core/src/pages/Kanban packages/app-core/src/pages/Analytics packages/app-core/src/pages/Assistant packages/app-core/src/pages/PlaceholderPage.tsx packages/app-core/src/i18n/locales
git commit -m "$(cat <<'EOF'
feat(i18n): translate Calendar, Kanban, Analytics, Smart Assistant, Placeholder pages

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Translate remaining Settings page content

**Files:**
- Modify: `packages/app-core/src/pages/Settings/SettingsPage.tsx`
- Modify: `packages/app-core/src/i18n/locales/en.json`
- Modify: `packages/app-core/src/i18n/locales/vi.json`

**Interfaces:**
- Consumes: same `t()`/`useTranslation()` pattern as Task 2/4/5/6; `settings` namespace already exists from Task 3 (extends it, doesn't replace it).

- [ ] **Step 1: Read the current `SettingsPage.tsx` in full**

(It was partially touched in Task 3 — only the Language field. This task translates everything else: page header, section headings — "General"/"Task Defaults"/"Focus & Schedule"/"Smart Engine" — all field labels, all `WEEKDAYS`/`STATUSES`/`PRIORITIES` option labels shown in `<select>` dropdowns, toggle row labels/descriptions, and the "these control the Smart Engine..." helper text.)

Note: `STATUSES`/`PRIORITIES` come from `@stm/types` (`TaskStatus`/`Priority` union types) and are used elsewhere in the app as literal data values (e.g. a task's actual status) — do NOT change what value is stored/sent to the backend (still the English enum string like `"In Progress"`), only translate what's *displayed* to the user in the `<option>` text, keeping `value={status}` as the untranslated enum. Add a small local lookup map for this purpose, e.g.:
```typescript
const STATUS_LABELS: Record<TaskStatus, string> = {
  Inbox: t('settings.statusInbox'),
  'To Do': t('settings.statusToDo'),
  'In Progress': t('settings.statusInProgress'),
  Waiting: t('settings.statusWaiting'),
  Completed: t('settings.statusCompleted'),
};
```
(defined inside the component body, after `const { t } = useTranslation();`, so it re-renders on language change), then render `<option key={status} value={status}>{STATUS_LABELS[status]}</option>` instead of `{status}`. Same pattern for `PRIORITIES` and `WEEKDAYS`.

- [ ] **Step 2: Add the remaining `settings.*` keys to both locale files**

Extend the existing `"settings"` object (from Task 3) in both `en.json`/`vi.json` with keys for every string identified in Step 1 — section headings, field labels, helper text, and the status/priority/weekday display-label maps.

- [ ] **Step 3: Add `useTranslation()` to `SettingsPage.tsx` if not already present from Task 3, and replace every remaining literal string**

- [ ] **Step 4: Typecheck, lint, format**

Run: `npm run typecheck && npm run lint && npm run format`
Expected: all exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/app-core/src/pages/Settings/SettingsPage.tsx packages/app-core/src/i18n/locales
git commit -m "$(cat <<'EOF'
feat(i18n): translate remaining Settings page content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: End-to-end verification

**Files:** none (verification only)

**Interfaces:** consumes everything from Tasks 1-7.

- [ ] **Step 1: Full repo verification**

Run (from repo root):
```bash
npm run typecheck
npm run lint
npm run format
npm run build --workspace=apps/desktop
npm run build --workspace=apps/web
```
Expected: all exit 0.

- [ ] **Step 2: Backend verification**

Run (from `backend/`): `dotnet build -c Release`
Expected: `Build succeeded. 0 Warning(s). 0 Error(s).`

- [ ] **Step 3: Grep for any remaining obvious hard-coded English JSX text**

```bash
grep -rn ">[A-Z][a-z]* [a-z]" packages/app-core/src/pages packages/app-core/src/components --include="*.tsx" | grep -v "t('" | grep -v "t(\`" | head -40
```
This is a heuristic, not a perfect check — review any hits manually and fix genuine misses (a literal UI string that should have been translated in Tasks 4-7 but wasn't). Data-bound JSX (e.g. `{task.title}`) won't match this pattern and is correctly not a finding.

- [ ] **Step 4: Real browser click-test if available**

Try loading `claude-in-chrome` (`ToolSearch` with query `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page`). If it connects and a local backend is reachable (same known-constraint check as Phase 33's Task 5 — this environment may have no local MySQL), run `npm run dev --workspace=apps/web`, navigate to the login page, confirm it renders in Vietnamese by default, register/login a test account, go to Settings, switch to English, confirm the whole app (nav, current page, Settings itself) re-renders in English immediately without a page reload, switch back to Vietnamese, log out and back in, confirm the language persisted (proves the backend round-trip). If either blocker applies (no browser tool, no local backend), state that honestly in the report instead of claiming it was tested.

- [ ] **Step 5: Update `docs/roadmap/ROADMAP.md`**

Read the file's current end. Append a new entry (Vietnamese, matching the existing narrative style) documenting: the `Language` column + `PATCH /api/auth/language` endpoint added to the backend, `react-i18next` bootstrapped in `packages/app-core`, every page under `pages/`/`components/` translated, the Settings language switcher now functional, and what Step 4 above actually verified vs. couldn't.

- [ ] **Step 6: Commit**

```bash
git add docs/roadmap/ROADMAP.md
git commit -m "$(cat <<'EOF'
docs: record i18n (VI/EN) rollout in ROADMAP.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

## Self-Review Notes

- **Spec coverage:** A1 (backend Language + endpoint) → Task 1. A2 (i18n bootstrap, AuthContext, Settings switcher, full string translation) → Tasks 2-7. Verification → Task 8.
- **Pattern consistency:** Every translation task (4-7) explicitly reuses Task 2's exact `useTranslation()`/`t()` pattern rather than redefining it — no divergent API introduced partway through.
- **Type consistency:** `AuthResult`/`AuthResponse` both gain `Language` as their final positional parameter in Task 1, matching what Task 2's `AuthContext` reads (`result.language`, lowercase per JSON serialization convention — camelCase on the JSON wire even though the C# record property is `Language`, matching this project's existing `JsonStringEnumConverter`/camelCase API convention already used elsewhere).
- **No placeholders:** Task 1 has exact C#; Task 2 has exact TypeScript/JSON for the bootstrap and one fully worked page (`LoginPage.tsx`) with an exact string-to-key table. Tasks 4-7 define the exact file list and exact namespace names per group, and point back to Task 2's fully worked example as the literal pattern to replicate — this is the appropriate level of specification for mechanical string-extraction work where the source `.tsx` file is the ground truth for what strings exist, not a vague "add appropriate translations."
