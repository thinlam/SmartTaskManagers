# Dark Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Light/Dark theme toggle to Settings, persisted per-User on the backend, applied via class-based Tailwind v4 dark mode (`.dark` on `<html>`) with no changes needed to individual components since they already use semantic color tokens.

**Architecture:** Backend mirrors the i18n `Language` pattern exactly: a new `User.Theme` column + `PATCH /api/auth/theme` endpoint. Frontend redefines the foundational color tokens inside a `.dark { ... }` CSS block in `packages/ui/src/styles/theme.css`; `AuthContext` toggles the `dark` class on `document.documentElement` and persists the choice the same way it already does for `language`.

**Tech Stack:** ASP.NET Core / EF Core (MySQL) for the backend piece; Tailwind v4 `@custom-variant`/CSS custom properties for the frontend piece.

**Spec:** `docs/superpowers/specs/2026-09-22-dark-mode-design.md`

## Global Constraints

- Mirror the already-reviewed-and-merged `Language` pattern exactly for `Theme` — same file shapes, same validation style, same error handling (`Guid.TryParse` → 401, `InvalidOperationException` → 404) — do not reinvent.
- Default theme for a brand-new user is `"light"`.
- `AuthResult`/`AuthResponse` only ever gain new fields — never remove/reorder existing ones (positional record parameters); `Theme` goes last, after `Language`.
- Only 8 foundational color tokens get dark values (`background`/`surface`/`surface-secondary`/`ink-primary`/`ink-secondary`/`ink-muted`/`border`/`border-strong`) — `primary`/`success`/`warning`/`danger`/`info`/`status-*`/`priority-*`/`risk-*` keep their current values in dark mode (per spec's explicit scope boundary).
- No new component library changes needed — reuse the existing `Switch` component from `@stm/ui`.
- Every change lives in `backend/`, `packages/app-core`, `packages/api-client`, or `packages/ui` — never duplicate anything into `apps/desktop`/`apps/web` directly.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- This repo has no unit test suite — verification is real `dotnet build`/`npm run typecheck`/`npm run lint`/`npm run build`/`curl` runs.
- A known environment constraint from prior plans: local MySQL may not be reachable in this session (confirmed unreachable in the i18n plan's Task 1/3, confirmed reachable-but-uncredentialed in its Task 8) — if a task's runtime verification step hits this, follow the same honest-reporting convention (state it, don't fake it, don't invent a fake connection string).

---

### Task 1: Backend — `Theme` on `User` + `PATCH /api/auth/theme`

**Files:**
- Modify: `backend/SmartTask.Domain/Users/User.cs`
- Modify: `backend/SmartTask.Persistence/Configurations/UserConfiguration.cs`
- Create: `backend/SmartTask.Persistence/Migrations/<timestamp>_AddUserTheme.cs` (via `dotnet ef migrations add`, not hand-written)
- Modify: `backend/SmartTask.Application/Auth/AuthContracts.cs`
- Modify: `backend/SmartTask.Application/Auth/AuthService.cs`
- Modify: `backend/SmartTask.Application/Auth/IAuthService.cs`
- Modify: `backend/SmartTask.Api/Controllers/AuthController.cs`

**Interfaces:**
- Produces: `User.Theme: string` (`"light"`/`"dark"`, default `"light"`); `AuthResult` gains a `Theme` field (last positional parameter, after `Language`); `AuthResponse` gains a `Theme` field (last positional parameter, after `Language`); new endpoint `PATCH /api/auth/theme` with body `{ "theme": "light" | "dark" }`, `[Authorize]`, returns `204 No Content` on success, `400` if `theme` isn't exactly `"light"` or `"dark"`, `401` if the JWT claim is malformed, `404` if the user row is gone.
- These are what Task 2 (frontend `AuthContext`) reads and calls.

**Reference — the current (post-i18n) shape of every file this task touches, read directly from the repo so no guessing is needed:**

`backend/SmartTask.Domain/Users/User.cs` currently:
```csharp
using SmartTask.Domain.Common;

namespace SmartTask.Domain.Users;

public sealed class User : Entity
{
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public string? DisplayName { get; set; }
    public string Language { get; set; } = "vi";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
```

`backend/SmartTask.Persistence/Configurations/UserConfiguration.cs` currently:
```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartTask.Domain.Users;

namespace SmartTask.Persistence.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.Property(u => u.Email).HasMaxLength(320).IsRequired();
        builder.Property(u => u.PasswordHash).HasMaxLength(1000).IsRequired();
        builder.Property(u => u.DisplayName).HasMaxLength(200);
        builder.Property(u => u.Language).HasMaxLength(5).IsRequired().HasDefaultValue("vi");

        builder.HasIndex(u => u.Email).IsUnique();
    }
}
```

`backend/SmartTask.Application/Auth/AuthContracts.cs` currently:
```csharp
namespace SmartTask.Application.Auth;

public sealed record RegisterRequest(string Email, string Password, string? DisplayName);

public sealed record LoginRequest(string Email, string Password);

public sealed record AuthResult(Guid UserId, string Email, string Token, DateTimeOffset ExpiresAt, string Language);
```

`backend/SmartTask.Application/Auth/IAuthService.cs` currently:
```csharp
namespace SmartTask.Application.Auth;

public interface IAuthService
{
    Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
    Task<AuthResult?> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task UpdateLanguageAsync(Guid userId, string language, CancellationToken cancellationToken);
}
```

`backend/SmartTask.Application/Auth/AuthService.cs` currently:
```csharp
using SmartTask.Application.Abstractions;
using SmartTask.Application.Users;
using SmartTask.Domain.Users;

namespace SmartTask.Application.Auth;

public sealed class AuthService(
    IUserRepository userRepository,
    IPasswordHasher passwordHasher,
    IJwtTokenGenerator tokenGenerator
) : IAuthService
{
    public async Task<AuthResult> RegisterAsync(
        RegisterRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var existing = await userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (existing is not null)
        {
            throw new InvalidOperationException("A user with this email already exists.");
        }

        var user = new User
        {
            Email = request.Email,
            PasswordHash = passwordHasher.Hash(request.Password),
            DisplayName = request.DisplayName,
        };

        await userRepository.AddAsync(user, cancellationToken);
        await userRepository.SaveChangesAsync(cancellationToken);

        return BuildAuthResult(user);
    }

    public async Task<AuthResult?> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var user = await userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (user is null || !passwordHasher.Verify(user.PasswordHash, request.Password))
        {
            return null;
        }

        return BuildAuthResult(user);
    }

    private AuthResult BuildAuthResult(User user)
    {
        var token = tokenGenerator.GenerateToken(user.Id, user.Email);
        return new AuthResult(user.Id, user.Email, token.Value, token.ExpiresAt, user.Language);
    }

    public async Task UpdateLanguageAsync(Guid userId, string language, CancellationToken cancellationToken)
    {
        var user = await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");
        user.Language = language;
        await userRepository.SaveChangesAsync(cancellationToken);
    }
}
```

`backend/SmartTask.Api/Controllers/AuthController.cs` currently:
```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTask.Application.Auth;

namespace SmartTask.Api.Controllers;

public sealed record AuthResponse(Guid UserId, string Email, string Token, DateTimeOffset ExpiresAt, string Language);

public sealed record UpdateLanguageRequest(string Language);

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var result = await authService.RegisterAsync(request, cancellationToken);
            return Ok(ToResponse(result));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(
        LoginRequest request,
        CancellationToken cancellationToken
    )
    {
        var result = await authService.LoginAsync(request, cancellationToken);
        if (result is null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        return Ok(ToResponse(result));
    }

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
        if (!Guid.TryParse(userId, out var parsedUserId))
        {
            return Unauthorized();
        }

        try
        {
            await authService.UpdateLanguageAsync(parsedUserId, request.Language, cancellationToken);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }

        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public ActionResult<object> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = User.FindFirstValue(ClaimTypes.Email);
        return Ok(new { userId, email });
    }

    private static AuthResponse ToResponse(AuthResult result) =>
        new(result.UserId, result.Email, result.Token, result.ExpiresAt, result.Language);
}
```

- [ ] **Step 1: Add `Theme` to `User.cs`**

Add this property after `Language`:
```csharp
    public string Theme { get; set; } = "light";
```

- [ ] **Step 2: Configure the column in `UserConfiguration.cs`**

Add this line after the `Language` configuration line:
```csharp
        builder.Property(u => u.Theme).HasMaxLength(5).IsRequired().HasDefaultValue("light");
```

- [ ] **Step 3: Generate the migration**

Run (from `backend/SmartTask.Persistence`):
```bash
dotnet ef migrations add AddUserTheme --startup-project ../SmartTask.Api
```
Expected: creates a migration adding a `Theme` column to `Users`, non-nullable, `varchar(5)`, with `defaultValue: "light"` (verify by reading the generated migration file — the `.HasDefaultValue("light")` from Step 2 should make this automatic this time, since the equivalent step for `Language` already established that EF Core needs the explicit `.HasDefaultValue(...)` call, not just the C# property initializer, to emit a migration-level default).

- [ ] **Step 4: Add `Theme` to `AuthResult` in `AuthContracts.cs`**

Change:
```csharp
public sealed record AuthResult(Guid UserId, string Email, string Token, DateTimeOffset ExpiresAt, string Language);
```
to:
```csharp
public sealed record AuthResult(Guid UserId, string Email, string Token, DateTimeOffset ExpiresAt, string Language, string Theme);
```

- [ ] **Step 5: Add `Theme` to `IAuthService.cs`**

Add this method signature, after `UpdateLanguageAsync`:
```csharp
    Task UpdateThemeAsync(Guid userId, string theme, CancellationToken cancellationToken);
```

- [ ] **Step 6: Update `AuthService.cs`**

Change `BuildAuthResult` to pass `user.Theme` as the final argument:
```csharp
    private AuthResult BuildAuthResult(User user)
    {
        var token = tokenGenerator.GenerateToken(user.Id, user.Email);
        return new AuthResult(user.Id, user.Email, token.Value, token.ExpiresAt, user.Language, user.Theme);
    }
```
Add a new method, following `UpdateLanguageAsync`'s exact pattern:
```csharp
    public async Task UpdateThemeAsync(Guid userId, string theme, CancellationToken cancellationToken)
    {
        var user = await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");
        user.Theme = theme;
        await userRepository.SaveChangesAsync(cancellationToken);
    }
```
(`GetByIdAsync` already exists on `IUserRepository` from the i18n work — no repository changes needed this time.)

- [ ] **Step 7: Update `AuthController.cs`**

Change `AuthResponse` to:
```csharp
public sealed record AuthResponse(Guid UserId, string Email, string Token, DateTimeOffset ExpiresAt, string Language, string Theme);
```
Add a new request record, alongside `UpdateLanguageRequest`:
```csharp
public sealed record UpdateThemeRequest(string Theme);
```
Add a new action, after `UpdateLanguage`, following its exact pattern:
```csharp
    [Authorize]
    [HttpPatch("theme")]
    public async Task<IActionResult> UpdateTheme(
        UpdateThemeRequest request,
        CancellationToken cancellationToken
    )
    {
        if (request.Theme is not ("light" or "dark"))
        {
            return BadRequest(new { message = "Theme must be 'light' or 'dark'." });
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var parsedUserId))
        {
            return Unauthorized();
        }

        try
        {
            await authService.UpdateThemeAsync(parsedUserId, request.Theme, cancellationToken);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }

        return NoContent();
    }
```
Update `ToResponse` to pass `result.Theme` as the final argument:
```csharp
    private static AuthResponse ToResponse(AuthResult result) =>
        new(result.UserId, result.Email, result.Token, result.ExpiresAt, result.Language, result.Theme);
```
Leave `Me()` unchanged (same reasoning as `Language` — it reads JWT claims only, no DB lookup, out of scope).

- [ ] **Step 8: Build and verify**

Run (from `backend/`): `dotnet build -c Release`
Expected: `Build succeeded. 0 Warning(s). 0 Error(s).`

- [ ] **Step 9: Apply the migration and verify with a real running server**

If a local MySQL instance is reachable, run `dotnet ef database update --startup-project ../SmartTask.Api` from `backend/SmartTask.Persistence`, then start the API (`dotnet run` from `backend/SmartTask.Api`) and:
```bash
curl -s -X POST http://localhost:5277/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"darkmode-test@example.com","password":"Test1234!","displayName":"Dark Mode Test"}'
```
Expected: JSON response includes `"theme":"light"`. Then:
```bash
curl -s -X PATCH http://localhost:5277/api/auth/theme \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token from register response>" \
  -d '{"theme":"dark"}'
```
Expected: `204` (empty body). Delete the test user afterward per this repo's established test-data-cleanup convention (see `backend/README.md`).

If no local MySQL is reachable, report this honestly instead of skipping: state clearly in your task report that runtime verification wasn't possible, and that only `dotnet build` was verified. Do NOT invent a fake `ConnectionStrings:DefaultConnection` secret.

- [ ] **Step 10: Commit**

```bash
git add backend/SmartTask.Domain/Users/User.cs \
  backend/SmartTask.Persistence/Configurations/UserConfiguration.cs \
  backend/SmartTask.Persistence/Migrations \
  backend/SmartTask.Application/Auth \
  backend/SmartTask.Api/Controllers/AuthController.cs
git commit -m "$(cat <<'EOF'
feat(backend): add per-user Theme preference + PATCH /api/auth/theme

Mirrors the i18n Language pattern exactly: a new Theme column on User
(default "light"), returned in AuthResult/AuthResponse from
register/login, and a new PATCH /api/auth/theme endpoint to update
it. Reuses the existing IUserRepository.GetByIdAsync (added for
Language) — no repository changes needed.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Frontend — dark color tokens + `AuthContext`/`authApi` wiring

**Files:**
- Modify: `packages/ui/src/styles/theme.css`
- Modify: `packages/api-client/src/authApi.ts`
- Modify: `packages/app-core/src/state/AuthContext.tsx`
- Modify: `packages/app-core/src/pages/Auth/LoginPage.tsx`

**Interfaces:**
- Consumes: `AuthResult.Theme`/`AuthResponse.Theme` from Task 1's API responses (serializes to JSON `theme`, camelCase, same convention as `language`).
- Produces: `AuthContext`'s `theme: string | null` (readable state, not just a setter — Task 3's Settings toggle needs to know the current value to render correctly) and `setTheme(theme: 'light' | 'dark'): Promise<void>`.

**Reference — the current (post-i18n) shape of every file this task touches:**

`packages/ui/src/styles/theme.css` currently:
```css
/**
 * Tailwind v4 theme mapping — the CSS-facing counterpart of
 * packages/ui/src/tokens/*.ts. Tailwind v4 is CSS-native (no JS
 * theme.extend), so these values are duplicated by hand from the TS
 * tokens rather than generated from them; keep both in sync manually
 * whenever docs/design-system/design-tokens.md changes. A build step that
 * generates this file from the TS tokens would remove the duplication,
 * but isn't worth the complexity yet with a single consuming app.
 *
 * Consumed via `@import "@stm/ui/theme.css";` after `@import "tailwindcss";`
 * in each app's global stylesheet (apps/desktop now, apps/web at Phase 33).
 */
@theme {
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;

  --color-primary: #4f46e5;
  --color-primary-hover: #4338ca;
  --color-primary-light: #eef2ff;

  --color-success: #16a34a;
  --color-success-soft: #ecfdf5;
  --color-warning: #d97706;
  --color-warning-soft: #fff7ed;
  --color-danger: #dc2626;
  --color-danger-soft: #fef2f2;
  --color-info: #2563eb;
  --color-info-soft: #eff6ff;

  --color-background: #f8fafc;
  --color-surface: #ffffff;
  --color-surface-secondary: #f1f5f9;

  --color-ink-primary: #0f172a;
  --color-ink-secondary: #475569;
  --color-ink-muted: #94a3b8;

  --color-border: #e2e8f0;
  --color-border-strong: #cbd5e1;

  --color-dark-header: #172033;

  --color-status-inbox: #94a3b8;
  --color-status-to-do: #64748b;
  --color-status-in-progress: #2563eb;
  --color-status-waiting: #f59e0b;
  --color-status-completed: #16a34a;

  --color-priority-critical: #dc2626;
  --color-priority-urgent: #ea580c;
  --color-priority-high: #f59e0b;
  --color-priority-medium: #2563eb;
  --color-priority-low: #64748b;

  --color-risk-low: #16a34a;
  --color-risk-medium: #f59e0b;
  --color-risk-high: #ea580c;
  --color-risk-critical: #dc2626;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-pill: 9999px;

  --shadow-sm: 0 1px 2px 0 rgb(15 23 42 / 0.04);
  --shadow-md: 0 2px 8px 0 rgb(15 23 42 / 0.06);
  --shadow-lg: 0 8px 24px -4px rgb(15 23 42 / 0.1);
}
```

`packages/api-client/src/authApi.ts` currently:
```typescript
import { httpClient } from './httpClient';

export interface AuthResponse {
  userId: string;
  email: string;
  token: string;
  expiresAt: string;
  language: string;
}

/** Matches SmartTask.Api's AuthController (Phase 22) exactly — POST /api/auth/register, /login, PATCH /language. */
export const authApi = {
  register: (email: string, password: string, displayName?: string): Promise<AuthResponse> =>
    httpClient.post<AuthResponse>('/api/auth/register', { email, password, displayName }),
  login: (email: string, password: string): Promise<AuthResponse> =>
    httpClient.post<AuthResponse>('/api/auth/login', { email, password }),
  updateLanguage: (language: 'vi' | 'en'): Promise<void> =>
    httpClient.patch<void>('/api/auth/language', { language }),
};
```

`packages/app-core/src/state/AuthContext.tsx` currently:
```typescript
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi, setAuthToken } from '@stm/api-client';
import i18n from '../i18n';

const STORAGE_KEY = 'stm.auth';

interface StoredAuth {
  token: string;
  email: string;
  expiresAt: string;
  language: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  email: string | null;
  isHydrating: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  setLanguage: (language: 'vi' | 'en') => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    const stored = readStoredAuth();
    if (stored) {
      setAuthToken(stored.token);
      setAuth(stored);
      void i18n.changeLanguage(stored.language);
    }
    setIsHydrating(false);
  }, []);

  function persist(next: StoredAuth) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem('stm.language', next.language);
    setAuthToken(next.token);
    setAuth(next);
    void i18n.changeLanguage(next.language);
  }

  async function login(email: string, password: string) {
    const result = await authApi.login(email, password);
    persist({
      token: result.token,
      email: result.email,
      expiresAt: result.expiresAt,
      language: result.language,
    });
  }

  async function register(email: string, password: string, displayName?: string) {
    const result = await authApi.register(email, password, displayName);
    persist({
      token: result.token,
      email: result.email,
      expiresAt: result.expiresAt,
      language: result.language,
    });
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setAuth(null);
  }

  async function setLanguage(language: 'vi' | 'en') {
    try {
      await authApi.updateLanguage(language);
    } catch (error) {
      console.error('Failed to persist language preference:', error);
      throw error;
    }
    void i18n.changeLanguage(language);
    if (auth) {
      persist({ ...auth, language });
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: auth !== null,
        email: auth?.email ?? null,
        isHydrating,
        login,
        register,
        logout,
        setLanguage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
```

`packages/app-core/src/pages/Auth/LoginPage.tsx`'s relevant top section currently:
```typescript
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@stm/ui';
import { ApiError, configureApiClient } from '@stm/api-client';
import { useAuthContext } from '../../state/AuthContext';
import { getStoredServerUrl, setStoredServerUrl } from '../../lib/serverUrl';
import i18n from '../../i18n';

// ... fieldClasses/labelClasses constants ...

export function LoginPage() {
  const { login, register } = useAuthContext();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState(() => getStoredServerUrl());
  const [showServerField, setShowServerField] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('stm.language');
    if (stored === 'vi' || stored === 'en') {
      void i18n.changeLanguage(stored);
    }
  }, []);

  // ... handleSubmit and JSX unchanged, not reproduced here ...
```

- [ ] **Step 1: Add `@custom-variant dark` and the `.dark` token block to `theme.css`**

Add this line as the very first line of the file (before the doc comment, or right after it — either is fine, just before the `@theme` block):
```css
@custom-variant dark (&:where(.dark, .dark *));
```
Then, after the closing `}` of the `@theme` block, add:
```css

.dark {
  --color-background: #0f172a;
  --color-surface: #1e293b;
  --color-surface-secondary: #334155;
  --color-ink-primary: #f1f5f9;
  --color-ink-secondary: #cbd5e1;
  --color-ink-muted: #64748b;
  --color-border: #334155;
  --color-border-strong: #475569;
}
```
Do not touch any other token (`primary`/`success`/`warning`/`danger`/`info`/`status-*`/`priority-*`/`risk-*`/`radius-*`/`shadow-*`/`font-sans`/`color-dark-header`) — only these 8 foundational tokens get dark values, per the spec's explicit scope.

- [ ] **Step 2: Add `theme` to `AuthResponse` and add `updateTheme` in `authApi.ts`**

Change:
```typescript
export interface AuthResponse {
  userId: string;
  email: string;
  token: string;
  expiresAt: string;
  language: string;
}

/** Matches SmartTask.Api's AuthController (Phase 22) exactly — POST /api/auth/register, /login, PATCH /language. */
export const authApi = {
  register: (email: string, password: string, displayName?: string): Promise<AuthResponse> =>
    httpClient.post<AuthResponse>('/api/auth/register', { email, password, displayName }),
  login: (email: string, password: string): Promise<AuthResponse> =>
    httpClient.post<AuthResponse>('/api/auth/login', { email, password }),
  updateLanguage: (language: 'vi' | 'en'): Promise<void> =>
    httpClient.patch<void>('/api/auth/language', { language }),
};
```
to:
```typescript
export interface AuthResponse {
  userId: string;
  email: string;
  token: string;
  expiresAt: string;
  language: string;
  theme: string;
}

/** Matches SmartTask.Api's AuthController (Phase 22) exactly — POST /api/auth/register, /login, PATCH /language, PATCH /theme. */
export const authApi = {
  register: (email: string, password: string, displayName?: string): Promise<AuthResponse> =>
    httpClient.post<AuthResponse>('/api/auth/register', { email, password, displayName }),
  login: (email: string, password: string): Promise<AuthResponse> =>
    httpClient.post<AuthResponse>('/api/auth/login', { email, password }),
  updateLanguage: (language: 'vi' | 'en'): Promise<void> =>
    httpClient.patch<void>('/api/auth/language', { language }),
  updateTheme: (theme: 'light' | 'dark'): Promise<void> =>
    httpClient.patch<void>('/api/auth/theme', { theme }),
};
```

- [ ] **Step 3: Update `AuthContext.tsx`**

Replace the file's full content with (changes from the current version: `StoredAuth` gains `theme`; `AuthContextValue` gains a readable `theme` field and `setTheme`; a new `applyTheme` helper toggles the DOM class; `persist()` and the hydrate `useEffect` both call it and write `stm.theme` to localStorage; `setTheme` mirrors `setLanguage`'s try/catch-and-rethrow pattern exactly):
```typescript
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi, setAuthToken } from '@stm/api-client';
import i18n from '../i18n';

const STORAGE_KEY = 'stm.auth';

interface StoredAuth {
  token: string;
  email: string;
  expiresAt: string;
  language: string;
  theme: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  email: string | null;
  theme: string | null;
  isHydrating: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  setLanguage: (language: 'vi' | 'en') => Promise<void>;
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function applyTheme(theme: string) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    const stored = readStoredAuth();
    if (stored) {
      setAuthToken(stored.token);
      setAuth(stored);
      void i18n.changeLanguage(stored.language);
      applyTheme(stored.theme);
    }
    setIsHydrating(false);
  }, []);

  function persist(next: StoredAuth) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem('stm.language', next.language);
    localStorage.setItem('stm.theme', next.theme);
    setAuthToken(next.token);
    setAuth(next);
    void i18n.changeLanguage(next.language);
    applyTheme(next.theme);
  }

  async function login(email: string, password: string) {
    const result = await authApi.login(email, password);
    persist({
      token: result.token,
      email: result.email,
      expiresAt: result.expiresAt,
      language: result.language,
      theme: result.theme,
    });
  }

  async function register(email: string, password: string, displayName?: string) {
    const result = await authApi.register(email, password, displayName);
    persist({
      token: result.token,
      email: result.email,
      expiresAt: result.expiresAt,
      language: result.language,
      theme: result.theme,
    });
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setAuth(null);
  }

  async function setLanguage(language: 'vi' | 'en') {
    try {
      await authApi.updateLanguage(language);
    } catch (error) {
      console.error('Failed to persist language preference:', error);
      throw error;
    }
    void i18n.changeLanguage(language);
    if (auth) {
      persist({ ...auth, language });
    }
  }

  async function setTheme(theme: 'light' | 'dark') {
    try {
      await authApi.updateTheme(theme);
    } catch (error) {
      console.error('Failed to persist theme preference:', error);
      throw error;
    }
    applyTheme(theme);
    if (auth) {
      persist({ ...auth, theme });
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: auth !== null,
        email: auth?.email ?? null,
        theme: auth?.theme ?? null,
        isHydrating,
        login,
        register,
        logout,
        setLanguage,
        setTheme,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
```

- [ ] **Step 4: Add the pre-login theme fallback to `LoginPage.tsx`**

Read the file's current `useEffect` (shown in the reference section above). Change it from:
```typescript
  useEffect(() => {
    const stored = localStorage.getItem('stm.language');
    if (stored === 'vi' || stored === 'en') {
      void i18n.changeLanguage(stored);
    }
  }, []);
```
to:
```typescript
  useEffect(() => {
    const storedLanguage = localStorage.getItem('stm.language');
    if (storedLanguage === 'vi' || storedLanguage === 'en') {
      void i18n.changeLanguage(storedLanguage);
    }
    const storedTheme = localStorage.getItem('stm.theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    }
  }, []);
```
(Renamed the local `stored` variable to `storedLanguage` to make room for `storedTheme` — this is the only change to this `useEffect`; do not touch anything else in this file.)

- [ ] **Step 5: Install, typecheck, build**

Run (from repo root): `npm install && npm run typecheck && npm run build --workspace=apps/desktop && npm run build --workspace=apps/web`
Expected: all exit 0.

- [ ] **Step 6: Run lint and format**

Run: `npm run lint && npm run format`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/styles/theme.css packages/api-client/src/authApi.ts packages/app-core/src/state/AuthContext.tsx packages/app-core/src/pages/Auth/LoginPage.tsx
git commit -m "$(cat <<'EOF'
feat(app-core): dark mode tokens + AuthContext/authApi wiring

Adds @custom-variant dark and a .dark { ... } block redefining the 8
foundational color tokens (background/surface/ink/border) in
theme.css — component classes never change, only the CSS variable
values behind them. AuthContext now exposes a readable `theme` field
and setTheme(), toggling the `dark` class on <html> and persisting
via the new PATCH /api/auth/theme endpoint (Task 1), mirroring
setLanguage()'s pattern exactly including its try/catch/rethrow.
LoginPage's pre-auth useEffect gained the same localStorage fallback
`stm.theme` already established for `stm.language`.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Settings — Dark Mode toggle

**Files:**
- Modify: `packages/app-core/src/pages/Settings/SettingsPage.tsx`
- Modify: `packages/app-core/src/i18n/locales/en.json`
- Modify: `packages/app-core/src/i18n/locales/vi.json`

**Interfaces:**
- Consumes: `theme`/`setTheme` from `useAuthContext()` (Task 2).

**Reference:** the file's current Language field block (inside the "General" section's grid) is:
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
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-week-start" className={labelClasses}>
```
(The `settings-week-start` field immediately follows — this is the exact insertion point.)

- [ ] **Step 1: Add `Switch` and `useAuthContext`'s `theme`/`setTheme` to the component**

Read `packages/app-core/src/pages/Settings/SettingsPage.tsx` in full. `Switch` is already imported from `@stm/ui` (used by the Smart Engine toggle rows further down) and `useAuthContext` is already imported (used for `setLanguage`) — no new imports needed. Change:
```typescript
  const { setLanguage } = useAuthContext();
```
to:
```typescript
  const { theme, setTheme } = useAuthContext();
```

- [ ] **Step 2: Insert the Dark Mode field into the "General" section's grid**

Insert this new field block immediately after the Language field's closing `</div>` and before the Week Start field's opening `<div>` (matching the reference section above exactly):
```tsx
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-dark-mode" className={labelClasses}>
              {t('settings.darkMode')}
            </label>
            <div className="flex items-center gap-2 pt-1">
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => void setTheme(checked ? 'dark' : 'light')}
                aria-label={t('settings.darkMode')}
              />
              <span className="text-sm text-ink-secondary">
                {theme === 'dark' ? t('settings.darkModeOn') : t('settings.darkModeOff')}
              </span>
            </div>
          </div>
```

- [ ] **Step 3: Add the 3 new keys to both locale files**

Read `packages/app-core/src/i18n/locales/en.json` and add these 3 keys to the existing `"settings"` object (alongside `language`/`languageVi`/`languageEn`):
```json
    "darkMode": "Dark Mode",
    "darkModeOn": "On",
    "darkModeOff": "Off"
```
Read `packages/app-core/src/i18n/locales/vi.json` and add the equivalent:
```json
    "darkMode": "Chế độ tối",
    "darkModeOn": "Bật",
    "darkModeOff": "Tắt"
```

- [ ] **Step 4: Typecheck and build**

Run (from repo root): `npm run typecheck && npm run build --workspace=apps/web`
Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/app-core/src/pages/Settings/SettingsPage.tsx packages/app-core/src/i18n/locales
git commit -m "$(cat <<'EOF'
feat(settings): add Dark Mode toggle

Adds a Switch row to Settings' General section, right below
Language, bound to AuthContext's theme/setTheme (Task 2) so it
toggles the dark class on <html> immediately and persists via
PATCH /api/auth/theme. Rest of the Settings page is untouched.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: End-to-end verification

**Files:** `docs/roadmap/ROADMAP.md` (Step 4)

**Interfaces:** consumes everything from Tasks 1-3.

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

- [ ] **Step 3: Visual/runtime check if a browser tool is available**

Check whether `claude-in-chrome` is available (`ToolSearch` with query `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page`) AND whether a local backend is reachable (check for a reachable local MySQL + known `ConnectionStrings:DefaultConnection` — this environment has been inconsistent across sessions per the Global Constraints note; verify fresh, don't assume). If both are available: run `npm run dev --workspace=apps/web`, log in, go to Settings, toggle Dark Mode on, confirm the whole app (background, surfaces, text, borders) switches to dark immediately with readable contrast everywhere visible (Dashboard, Sidebar, at least one detail drawer), toggle back to light, reload the page, confirm the last-set theme persisted. If either blocker applies, state that honestly rather than claiming it was tested — same convention as every prior plan in this project.

- [ ] **Step 4: Update `docs/roadmap/ROADMAP.md`**

Read the file's current end. Append a new entry (Vietnamese, matching the existing narrative style — do NOT invent a "Phase N" heading, this work is outside the sequential Phase numbering just like the i18n entry was corrected to be) documenting: the `Theme` column + `PATCH /api/auth/theme` endpoint (Task 1), the `.dark` CSS token block + `AuthContext` wiring (Task 2), the Settings toggle (Task 3), and what Step 3 above actually verified vs. couldn't.

- [ ] **Step 5: Commit**

```bash
git add docs/roadmap/ROADMAP.md
git commit -m "$(cat <<'EOF'
docs: record dark mode rollout in ROADMAP.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

## Self-Review Notes

- **Spec coverage:** B1 (backend Theme + endpoint) → Task 1. B2 (dark tokens, AuthContext, Settings toggle) → Tasks 2-3. Verification → Task 4.
- **Pattern fidelity:** Task 1 is a line-for-line mirror of the already-reviewed `Language`/`PATCH /api/auth/language` code, including the hardening (`Guid.TryParse`, `NotFound()` on missing user) that the i18n plan's final review added as a fix-round — Theme gets that hardening from the start, no fix round needed here.
- **Bug-avoidance:** the i18n plan's final review found a real bug (`stm.language` read but never written). This plan's Task 2 writes `localStorage.setItem('stm.theme', ...)` inside `persist()` from the start (Step 3), and the `LoginPage.tsx` fallback (Step 4) reads it — both sides present in the same task, not split across tasks where one could be missed.
- **Type/name consistency:** `AuthResult`/`AuthResponse` both gain `Theme` as the final positional parameter (after `Language`) in Task 1; `AuthContext`'s `theme`/`setTheme` and `authApi`'s `updateTheme` all agree on the `'light' | 'dark'` union type and the `theme` (lowercase, camelCase JSON) field name throughout.
- **No placeholders:** Task 1 has exact C# for every file (reproduced current-state + exact diff). Task 2 has exact TypeScript/CSS with full current-file reproductions for the 2 trickiest files (`AuthContext.tsx`, `LoginPage.tsx`'s relevant section) plus `authApi.ts`. Task 3 has exact JSX/JSON. No task asks an implementer to "figure out" a file's current shape from scratch — every file this plan touches was read directly from the post-i18n-merge repository state while writing this plan.
