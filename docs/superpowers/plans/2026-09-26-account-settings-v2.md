# Account Settings v2 (Avatar, Change Password, Active Sessions) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Account Settings gets a real, working avatar (upload/change), change-password form, and an Active Sessions list with per-session revoke — all backed by real API endpoints, not mockup UI.

**Architecture:** Avatar bytes live in MySQL as a BLOB column on `Users` (no external storage, survives Railway redeploys). A new `Sessions` table turns today's fully-stateless JWTs into revocable ones by reusing the JWT's own `jti` claim as the session's row id; the existing per-request "current user" middleware is extended to reject requests whose session has been revoked. Both features are additive on top of the existing per-user data isolation mechanism (`ICurrentUserContext`, `AppDbContext`'s global query filter) built earlier in this project.

**Tech Stack:** ASP.NET Core 10, EF Core (Microting.EntityFrameworkCore.MySql), MySQL 8.0 (Railway), React 19 + TypeScript (packages/app-core, packages/ui, packages/api-client).

**Spec:** `docs/superpowers/specs/2026-09-26-account-settings-v2-design.md`

## Global Constraints

- No test project exists in this repo — verification is `dotnet build -c Release` (0 warnings/0 errors) plus real `curl` checks against a running instance, and `npm run build:tauri` / `npm run build:web` for the frontend. This matches every other backend change made in this project so far.
- Follow existing Clean Architecture layering exactly: interfaces in `SmartTask.Application`, implementations in `SmartTask.Infrastructure`/`SmartTask.Persistence`, HTTP-specific parsing (reading `User-Agent`/IP headers) stays in `SmartTask.Api`, never leaks into `SmartTask.Application`.
- Match existing code style precisely: file-scoped `namespace X;`, primary constructors (`public sealed class Foo(IBar bar) : IFoo`), XML-doc `///` comments only where they explain *why*.
- Every EF Core migration must be generated with `dotnet ef migrations add`, run from `backend/SmartTask.Api` — never hand-write `AppDbContextModelSnapshot.cs`.
- Comments English-only (the one exception — recent Vietnamese comments in `Program.cs` — was already flagged in this project as inconsistent; do not add more).
- Avatar: `image/jpeg`, `image/png`, or `image/webp` only, capped at 1,500,000 bytes decoded. Active Sessions: IP + parsed User-Agent label only — no GeoIP lookup, no external service. Out of scope this round: Delete Account, 2FA, Notifications tab, Connected Apps.
- Every user-owned entity (`Session` included) participates in the existing per-user data isolation mechanism from `docs/superpowers/specs/2026-09-23-per-user-data-isolation-design.md` — global query filter + `SaveChangesAsync` auto-assign in `AppDbContext`. Do not add a parallel/ad-hoc scoping mechanism for `Session`.

## Review Focus

- **A revoked session's token is used again immediately after revocation** — must get `401` on its very next request, not just stop appearing in the sessions list. Task 7's middleware extension is what this depends on; Task 9's end-to-end curl check is where this gets pinned down.
- **Changing your password while logged in on a second device** — the second device's session must be revoked (its next request gets `401`), while the device that changed the password keeps working uninterrupted. Task 6's `ChangePasswordAsync` must exclude `currentSessionId` from the revoke loop; Task 9 verifies both halves.
- **An avatar upload that is technically valid JSON but not a real image, or is over the byte cap, or has a disallowed content type** — must be rejected with `400`, never silently truncated or saved as garbage bytes that break the `data:` URI the frontend renders. Task 6's `UpdateAvatarAsync`/controller validation and Task 11's client-side cap must both hold — a client-side check is not a substitute for the server one, since the API is reachable from anywhere.
- **Revoking your own current session via `DELETE /sessions/{id}`, or trying to revoke a session that belongs to a different account (or doesn't exist)** — the former must be `400` with a clear message (that's what Sign Out is for), the latter must be `404`, and neither must ever revoke or reveal another account's session. Task 6/7 own this; Task 9's curl checks include both.
- **A JWT minted before this change lands** (no session row exists for its `jti`, because it predates the `Sessions` table) — must not crash the middleware or lock every existing logged-in user out with a confusing error; the existing user simply needs to log in again once. Task 7's middleware must treat "no session found for this jti" as an ordinary `401` (already-logged-out state), not an unhandled exception.

---

## File Structure

| File | Responsibility |
|---|---|
| `backend/SmartTask.Domain/Users/User.cs` | Modify. Add `AvatarData`, `AvatarContentType`. |
| `backend/SmartTask.Domain/Auth/Session.cs` | New. The `Session` entity. |
| `backend/SmartTask.Persistence/Configurations/UserConfiguration.cs` | Modify. Column config for the 2 new columns. |
| `backend/SmartTask.Persistence/Configurations/SessionConfiguration.cs` | New. FK + index. |
| `backend/SmartTask.Persistence/AppDbContext.cs` | Modify. `DbSet<Session>`, query filter, auto-assign switch case. |
| `backend/SmartTask.Persistence/AppDbContextFactory.cs` | Modify. `StubCurrentUserContext` gets the new `SessionId` member. |
| `backend/SmartTask.Application/Abstractions/ICurrentUserContext.cs` | Modify. Add `SessionId`. |
| `backend/SmartTask.Infrastructure/Security/CurrentUserContext.cs` | Modify. Add `SessionId`. |
| `backend/SmartTask.Application/Auth/ISessionRepository.cs` | New. |
| `backend/SmartTask.Persistence/Repositories/SessionRepository.cs` | New. |
| `backend/SmartTask.Persistence/DependencyInjection.cs` | Modify. Register `ISessionRepository`. |
| `backend/SmartTask.Api/DeviceLabelParser.cs` | New. Pure `User-Agent` → human label parser. |
| `backend/SmartTask.Application/Abstractions/IJwtTokenGenerator.cs` | Modify. `GenerateToken` gains a `sessionId` parameter. |
| `backend/SmartTask.Infrastructure/Security/JwtTokenGenerator.cs` | Modify. Use the passed-in `sessionId` as `jti` instead of inventing one. |
| `backend/SmartTask.Application/Auth/AuthContracts.cs` | Modify. `AuthResult` gains `AvatarDataUrl`; new request/summary records. |
| `backend/SmartTask.Application/Auth/IAuthService.cs` | Modify. New method signatures. |
| `backend/SmartTask.Application/Auth/AuthService.cs` | Modify. Session creation on login/register, avatar/password/session methods. |
| `backend/SmartTask.Api/Controllers/AuthController.cs` | Modify. New/changed endpoints. |
| `backend/SmartTask.Api/Program.cs` | Modify. Extend the current-user middleware with session validation. |
| `backend/SmartTask.Persistence/Migrations/<timestamp>_AddAvatarAndSessions.cs` | New (generated). |
| `packages/api-client/src/authApi.ts` | Modify. New API functions, `avatarDataUrl` field. |
| `packages/app-core/src/state/AuthContext.tsx` | Modify. `avatarDataUrl`, `setAvatar`, async `logout`. |
| `packages/app-core/src/lib/passwordRules.ts` | New. Extracted from `LoginPage.tsx`. |
| `packages/ui/src/components/PasswordStrengthChecklist/PasswordStrengthChecklist.tsx` | New. Extracted checklist UI. |
| `packages/app-core/src/pages/Auth/LoginPage.tsx` | Modify. Use the extracted rules/component instead of its own copy. |
| `packages/app-core/src/pages/AccountSettings/AccountSettingsPage.tsx` | Rewrite. Profile (avatar), Security (change password), Active Sessions. |
| `docs/roadmap/ROADMAP.md` | Modify. Record what shipped and what was verified. |

---

### Task 1: `Session` entity, `User` avatar columns, and EF configuration

**Files:**
- Create: `backend/SmartTask.Domain/Auth/Session.cs`
- Modify: `backend/SmartTask.Domain/Users/User.cs`
- Create: `backend/SmartTask.Persistence/Configurations/SessionConfiguration.cs`
- Modify: `backend/SmartTask.Persistence/Configurations/UserConfiguration.cs`

**Interfaces:**
- Produces: `Session` with plain settable properties `Guid UserId`, `required string DeviceLabel`, `string? IpAddress`, `DateTimeOffset CreatedAt` (default now), `DateTimeOffset LastActiveAt` (default now), `DateTimeOffset ExpiresAt` (no default — always set explicitly before the first save), `DateTimeOffset? RevokedAt` (default null). `User.AvatarData` (`byte[]?`) and `User.AvatarContentType` (`string?`). Every later task in this plan references these exact names.

- [ ] **Step 1: Create `Session.cs`**

```csharp
using SmartTask.Domain.Common;

namespace SmartTask.Domain.Auth;

/// <summary>
/// One issued JWT = one Session row, with the same id (see
/// JwtTokenGenerator.GenerateToken's sessionId parameter and
/// AuthService's login/register flow) — this is what lets a normally
/// stateless JWT be revoked early: the current-user middleware
/// (Program.cs) looks up this row by the token's own `jti` claim on
/// every authenticated request and rejects it if RevokedAt is set.
/// ExpiresAt mirrors the JWT's own expiry — used only to hide
/// naturally-stale rows from the Active Sessions list; the JWT's own
/// signature/expiry check (already in place) is what actually rejects
/// an expired token before this row is even looked at.
/// </summary>
public sealed class Session : Entity
{
    public Guid UserId { get; set; }
    public required string DeviceLabel { get; set; }
    public string? IpAddress { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastActiveAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
}
```

- [ ] **Step 2: Add the two avatar columns to `User.cs`**

In `backend/SmartTask.Domain/Users/User.cs`, add after `DisplayName`:

```csharp
    public string? DisplayName { get; set; }
    public byte[]? AvatarData { get; set; }
    public string? AvatarContentType { get; set; }
    public string Language { get; set; } = "vi";
```

- [ ] **Step 3: Create `SessionConfiguration.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartTask.Domain.Auth;

namespace SmartTask.Persistence.Configurations;

public sealed class SessionConfiguration : IEntityTypeConfiguration<Session>
{
    public void Configure(EntityTypeBuilder<Session> builder)
    {
        builder.ToTable("Sessions");

        builder.Property(s => s.DeviceLabel).HasMaxLength(200).IsRequired();
        builder.Property(s => s.IpAddress).HasMaxLength(45); // fits IPv6

        builder
            .HasOne<SmartTask.Domain.Users.User>()
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(s => s.UserId);
    }
}
```

- [ ] **Step 4: Add avatar column config to `UserConfiguration.cs`**

Add after the existing `builder.Property(u => u.DisplayName)...` line:

```csharp
        builder.Property(u => u.DisplayName).HasMaxLength(200);
        builder.Property(u => u.AvatarData).HasColumnType("longblob");
        builder.Property(u => u.AvatarContentType).HasMaxLength(20);
```

- [ ] **Step 5: Build to verify**

Run: `cd backend && dotnet build -c Release`
Expected: `Build succeeded. 0 Warning(s) 0 Error(s)`

- [ ] **Step 6: Commit**

```bash
git add backend/SmartTask.Domain/Auth/Session.cs backend/SmartTask.Domain/Users/User.cs backend/SmartTask.Persistence/Configurations/SessionConfiguration.cs backend/SmartTask.Persistence/Configurations/UserConfiguration.cs
git commit -m "feat(backend): add Session entity and User avatar columns"
```

---

### Task 2: `ICurrentUserContext.SessionId`, `AppDbContext`, `AppDbContextFactory`

**Files:**
- Modify: `backend/SmartTask.Application/Abstractions/ICurrentUserContext.cs`
- Modify: `backend/SmartTask.Infrastructure/Security/CurrentUserContext.cs`
- Modify: `backend/SmartTask.Persistence/AppDbContext.cs`
- Modify: `backend/SmartTask.Persistence/AppDbContextFactory.cs`

**Interfaces:**
- Consumes: `Session` (Task 1).
- Produces: `ICurrentUserContext.SessionId` (`Guid?`) — Task 7's middleware and Task 8's controller/service methods read/write this. `AppDbContext.Sessions` (`DbSet<Session>`) scoped by the same global-query-filter mechanism as every other user-owned entity.

- [ ] **Step 1: `ICurrentUserContext.cs`** — add the new member:

```csharp
public interface ICurrentUserContext
{
    Guid? UserId { get; set; }
    Guid? SessionId { get; set; }
}
```

- [ ] **Step 2: `CurrentUserContext.cs`** — add the matching property:

```csharp
public sealed class CurrentUserContext : ICurrentUserContext
{
    public Guid? UserId { get; set; }
    public Guid? SessionId { get; set; }
}
```

- [ ] **Step 3: `AppDbContext.cs`** — add the `Session` DbSet, using directive, query filter, and auto-assign case

Add `using SmartTask.Domain.Auth;` to the top. Add the DbSet:

```csharp
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<Habit> Habits => Set<Habit>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Session> Sessions => Set<Session>();
```

Add the query filter (after the existing `Notification` filter line):

```csharp
        modelBuilder.Entity<Notification>().HasQueryFilter(n => n.UserId == currentUserContext.UserId);
        modelBuilder.Entity<Session>().HasQueryFilter(s => s.UserId == currentUserContext.UserId);
```

Add the auto-assign case (after the existing `Notification` case, inside the `switch (entry.Entity)` block):

```csharp
                    case Notification notification:
                        notification.UserId = currentUserId.Value;
                        break;
                    case Session session:
                        session.UserId = currentUserId.Value;
                        break;
```

(This case never actually fires for the only real creation path — login/register, both unauthenticated, where `currentUserContext.UserId` is still null and the whole switch is skipped by the `if (currentUserId is not null)` guard above it — `AuthService` sets `Session.UserId` explicitly instead, the same way `RegisterAsync` already sets `User.Email` explicitly. It's included for consistency with every other user-owned entity in this file, matching this project's established per-user-isolation pattern.)

- [ ] **Step 4: `AppDbContextFactory.cs`** — update the design-time stub to implement the new interface member

```csharp
    private sealed class StubCurrentUserContext : ICurrentUserContext
    {
        public Guid? UserId { get; set; }
        public Guid? SessionId { get; set; }
    }
```

- [ ] **Step 5: Build to verify**

Run: `cd backend && dotnet build -c Release`
Expected: `Build succeeded. 0 Warning(s) 0 Error(s)`

- [ ] **Step 6: Commit**

```bash
git add backend/SmartTask.Application/Abstractions/ICurrentUserContext.cs backend/SmartTask.Infrastructure/Security/CurrentUserContext.cs backend/SmartTask.Persistence/AppDbContext.cs backend/SmartTask.Persistence/AppDbContextFactory.cs
git commit -m "feat(backend): scope Session to the current user, add SessionId to ICurrentUserContext"
```

---

### Task 3: `ISessionRepository` + `SessionRepository` + DI registration

**Files:**
- Create: `backend/SmartTask.Application/Auth/ISessionRepository.cs`
- Create: `backend/SmartTask.Persistence/Repositories/SessionRepository.cs`
- Modify: `backend/SmartTask.Persistence/DependencyInjection.cs`

**Interfaces:**
- Consumes: `Session` (Task 1), `AppDbContext.Sessions` (Task 2).
- Produces: `ISessionRepository` with `GetByIdAsync(Guid id, CancellationToken)`, `GetActiveAsync(CancellationToken)`, `AddAsync(Session, CancellationToken)`, `SaveChangesAsync(CancellationToken)`. Task 6 (`AuthService`) and Task 7 (`Program.cs` middleware) both call these exact names.

- [ ] **Step 1: Create `ISessionRepository.cs`**

```csharp
using SmartTask.Domain.Auth;

namespace SmartTask.Application.Auth;

/// <summary>Application depends on this; SmartTask.Persistence implements it against AppDbContext.</summary>
public interface ISessionRepository
{
    /// <summary>Tracked (not AsNoTracking) — the current-user middleware mutates LastActiveAt on the result and saves it.</summary>
    Task<Session?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Non-revoked, non-expired sessions for the current user (scoped by AppDbContext's global query filter — no userId parameter needed, same as every other GetAllAsync in this app).</summary>
    Task<List<Session>> GetActiveAsync(CancellationToken cancellationToken = default);

    Task AddAsync(Session session, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
```

- [ ] **Step 2: Create `SessionRepository.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using SmartTask.Application.Abstractions;
using SmartTask.Application.Auth;
using SmartTask.Domain.Auth;

namespace SmartTask.Persistence.Repositories;

public sealed class SessionRepository(AppDbContext dbContext, IDateTimeProvider dateTimeProvider) : ISessionRepository
{
    public Task<Session?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        dbContext.Sessions.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

    public Task<List<Session>> GetActiveAsync(CancellationToken cancellationToken = default)
    {
        var now = dateTimeProvider.UtcNow;
        return dbContext
            .Sessions.AsNoTracking()
            .Where(s => s.RevokedAt == null && s.ExpiresAt > now)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Session session, CancellationToken cancellationToken = default) =>
        await dbContext.Sessions.AddAsync(session, cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
```

- [ ] **Step 3: Register it in `DependencyInjection.cs`**

Add `using SmartTask.Application.Auth;` at the top, and this line alongside the other `AddScoped<I...Repository, ...Repository>()` calls:

```csharp
        services.AddScoped<ISessionRepository, SessionRepository>();
```

- [ ] **Step 4: Build to verify**

Run: `cd backend && dotnet build -c Release`
Expected: `Build succeeded. 0 Warning(s) 0 Error(s)`

- [ ] **Step 5: Commit**

```bash
git add backend/SmartTask.Application/Auth/ISessionRepository.cs backend/SmartTask.Persistence/Repositories/SessionRepository.cs backend/SmartTask.Persistence/DependencyInjection.cs
git commit -m "feat(backend): add ISessionRepository"
```

---

### Task 4: Migration — `AddAvatarAndSessions`

**Files:**
- Create: `backend/SmartTask.Persistence/Migrations/<timestamp>_AddAvatarAndSessions.cs` (+ `.Designer.cs`, generated)

**Interfaces:**
- Consumes: the model shape from Tasks 1–3.
- Produces: the real `AvatarData`/`AvatarContentType` columns on `Users` and the real `Sessions` table in the database.

- [ ] **Step 1: Generate the migration**

```bash
cd backend/SmartTask.Api
dotnet ef migrations add AddAvatarAndSessions --project ../SmartTask.Persistence --startup-project .
```

Expected: a new `<timestamp>_AddAvatarAndSessions.cs` + `.Designer.cs` under `SmartTask.Persistence/Migrations/`, and `AppDbContextModelSnapshot.cs` updated. Unlike the earlier per-user-isolation migration, **no hand-editing is needed here** — both changes are purely additive (new nullable columns, a brand-new table), so there's no existing-row backfill concern. Do not hand-edit this migration unless the generated `Up()`/`Down()` looks wrong on inspection.

- [ ] **Step 2: Read the generated file and confirm it's purely additive**

Open the new migration file. Confirm it contains only: `AddColumn` calls for `AvatarData` (type should read `longblob`) and `AvatarContentType` on `Users`, and a `CreateTable` call for `Sessions` (with its FK to `Users` and index on `UserId`) — nothing that alters or drops an existing column, and no `NOT NULL` constraint being added to a column on a table with existing rows (both new `Users` columns must be nullable). If anything else appears, stop and reconcile with Task 1–3's code before proceeding.

- [ ] **Step 3: Build to verify**

Run: `cd backend && dotnet build -c Release`
Expected: `Build succeeded. 0 Warning(s) 0 Error(s)`

- [ ] **Step 4: Commit**

```bash
git add backend/SmartTask.Persistence/Migrations/
git commit -m "feat(backend): migrate avatar columns and the Sessions table"
```

---

### Task 5: `DeviceLabelParser` + `IJwtTokenGenerator`/`JwtTokenGenerator` session id

**Files:**
- Create: `backend/SmartTask.Api/DeviceLabelParser.cs`
- Modify: `backend/SmartTask.Application/Abstractions/IJwtTokenGenerator.cs`
- Modify: `backend/SmartTask.Infrastructure/Security/JwtTokenGenerator.cs`

**Interfaces:**
- Produces: `DeviceLabelParser.Parse(string? userAgent) -> string` — Task 8 (`AuthController`) calls this. `IJwtTokenGenerator.GenerateToken(Guid userId, string email, Guid sessionId) -> JwtToken` — Task 6 (`AuthService`) calls this with a `Session`'s own `Id` as `sessionId`, so the token's `jti` claim and that `Session` row's id are the same value.

- [ ] **Step 1: Create `DeviceLabelParser.cs`**

```csharp
namespace SmartTask.Api;

/// <summary>
/// A small heuristic for the Active Sessions list's "MacBook Pro ·
/// Chrome"-style label — not a security boundary (the actual boundary
/// is the session id / revocation, not this string) and not a full
/// user-agent parsing library. Good enough for a human glancing at
/// their own device list.
/// </summary>
public static class DeviceLabelParser
{
    public static string Parse(string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent))
        {
            return "Unknown device";
        }

        var browser = userAgent switch
        {
            _ when userAgent.Contains("Edg/") => "Edge",
            _ when userAgent.Contains("Chrome/") => "Chrome",
            _ when userAgent.Contains("Firefox/") => "Firefox",
            _ when userAgent.Contains("Safari/") && !userAgent.Contains("Chrome/") => "Safari",
            _ => null,
        };

        var os = userAgent switch
        {
            _ when userAgent.Contains("Windows") => "Windows",
            _ when userAgent.Contains("Mac OS X") && userAgent.Contains("Mobile") => "iPhone",
            _ when userAgent.Contains("Mac OS X") => "Mac",
            _ when userAgent.Contains("Android") => "Android",
            _ when userAgent.Contains("Linux") => "Linux",
            _ => null,
        };

        return (browser, os) switch
        {
            (not null, not null) => $"{browser} on {os}",
            (not null, null) => browser,
            (null, not null) => os,
            (null, null) => "Unknown device",
        };
    }
}
```

- [ ] **Step 2: `IJwtTokenGenerator.cs`** — add the `sessionId` parameter

```csharp
public interface IJwtTokenGenerator
{
    JwtToken GenerateToken(Guid userId, string email, Guid sessionId);
}
```

- [ ] **Step 3: `JwtTokenGenerator.cs`** — use `sessionId` instead of inventing one

Replace this line inside `GenerateToken`:

```csharp
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
```

with:

```csharp
            new Claim(JwtRegisteredClaimNames.Jti, sessionId.ToString()),
```

And update the method signature:

```csharp
    public JwtToken GenerateToken(Guid userId, string email, Guid sessionId)
```

- [ ] **Step 4: Build to verify**

Run: `cd backend && dotnet build -c Release`
Expected: build FAILS at this point — `AuthService.cs` still calls the old 2-argument `GenerateToken(user.Id, user.Email)`. That's expected; Task 6 fixes it. Confirm the failure is specifically a "no overload takes 2 arguments" (or similar) error in `AuthService.cs`, not something else — if it's a different error, stop and investigate before continuing.

- [ ] **Step 5: Commit**

```bash
git add backend/SmartTask.Api/DeviceLabelParser.cs backend/SmartTask.Application/Abstractions/IJwtTokenGenerator.cs backend/SmartTask.Infrastructure/Security/JwtTokenGenerator.cs
git commit -m "feat(backend): thread a caller-provided session id into JWT generation as jti"
```

(Committing a build that doesn't compile is unusual, but this task's own deliverable — the parser and the signature change — is complete and independently reviewable; Task 6 is what makes the whole branch build again. This is called out explicitly in Task 6's brief so its implementer isn't surprised by a red build at the start.)

---

### Task 6: `AuthContracts`, `IAuthService`, `AuthService` — avatar, password, sessions, login/register session creation

**Files:**
- Modify: `backend/SmartTask.Application/Auth/AuthContracts.cs`
- Modify: `backend/SmartTask.Application/Auth/IAuthService.cs`
- Modify: `backend/SmartTask.Application/Auth/AuthService.cs`

**Interfaces:**
- Consumes: `ISessionRepository` (Task 3), `IJwtTokenGenerator.GenerateToken(userId, email, sessionId)` (Task 5), `User.AvatarData`/`AvatarContentType` (Task 1).
- Produces: the full `IAuthService` surface Task 8 (`AuthController`) calls against. Exact final shape below — copy these signatures verbatim.

**IMPORTANT — the branch will not build until this task is done.** Task 5 intentionally left the build broken (`AuthService` still calling the old `GenerateToken` overload). This task fixes that as part of its own changes.

- [ ] **Step 1: Rewrite `AuthContracts.cs`**

```csharp
namespace SmartTask.Application.Auth;

public sealed record RegisterRequest(string Email, string Password, string? DisplayName);

public sealed record LoginRequest(string Email, string Password);

public sealed record AuthResult(
    Guid UserId,
    string Email,
    string Token,
    DateTimeOffset ExpiresAt,
    string Language,
    string Theme,
    string? AvatarDataUrl
);

public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public sealed record UpdateAvatarRequest(string AvatarBase64, string ContentType);

public sealed record SessionSummary(
    Guid Id,
    string DeviceLabel,
    string? IpAddress,
    DateTimeOffset CreatedAt,
    DateTimeOffset LastActiveAt,
    bool IsCurrent
);
```

- [ ] **Step 2: Rewrite `IAuthService.cs`**

```csharp
namespace SmartTask.Application.Auth;

public interface IAuthService
{
    /// <summary>Throws InvalidOperationException if the email is already registered.</summary>
    Task<AuthResult> RegisterAsync(
        RegisterRequest request,
        string deviceLabel,
        string? ipAddress,
        CancellationToken cancellationToken = default
    );

    /// <summary>Returns null on a wrong email or password — the controller maps that to 401, not a specific "which one was wrong" message (don't leak which part failed).</summary>
    Task<AuthResult?> LoginAsync(
        LoginRequest request,
        string deviceLabel,
        string? ipAddress,
        CancellationToken cancellationToken = default
    );

    /// <summary>Throws InvalidOperationException if the user does not exist.</summary>
    Task UpdateLanguageAsync(Guid userId, string language, CancellationToken cancellationToken);

    /// <summary>Throws InvalidOperationException if the user does not exist.</summary>
    Task UpdateThemeAsync(Guid userId, string theme, CancellationToken cancellationToken);

    /// <summary>Throws InvalidOperationException if the user does not exist.</summary>
    Task UpdateAvatarAsync(
        Guid userId,
        string avatarBase64,
        string contentType,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Throws InvalidOperationException if the user does not exist,
    /// UnauthorizedAccessException if currentPassword is wrong. On
    /// success, revokes every OTHER session for this user (not
    /// currentSessionId) — a password change is a security-relevant
    /// event other devices should have to re-authenticate for.
    /// </summary>
    Task ChangePasswordAsync(
        Guid userId,
        Guid currentSessionId,
        string currentPassword,
        string newPassword,
        CancellationToken cancellationToken
    );

    /// <summary>Non-revoked, non-expired sessions for the calling user (scoped by AppDbContext's query filter), newest-active first.</summary>
    Task<List<SessionSummary>> GetSessionsAsync(Guid currentSessionId, CancellationToken cancellationToken);

    /// <summary>Throws InvalidOperationException if the session doesn't exist or doesn't belong to the caller (the query filter makes those indistinguishable, same as every other entity in this app).</summary>
    Task RevokeSessionAsync(Guid sessionToRevokeId, CancellationToken cancellationToken);

    /// <summary>Revokes every non-revoked session for the caller except currentSessionId.</summary>
    Task RevokeOtherSessionsAsync(Guid currentSessionId, CancellationToken cancellationToken);

    /// <summary>Revokes exactly this one session — used by POST /logout.</summary>
    Task LogoutAsync(Guid sessionId, CancellationToken cancellationToken);
}
```

- [ ] **Step 3: Rewrite `AuthService.cs`**

```csharp
using SmartTask.Application.Abstractions;
using SmartTask.Application.Users;
using SmartTask.Domain.Auth;
using SmartTask.Domain.Users;

namespace SmartTask.Application.Auth;

/// <summary>
/// The use case itself — lives in Application, not Infrastructure,
/// because it only orchestrates through abstractions (IUserRepository/
/// IPasswordHasher/IJwtTokenGenerator/ISessionRepository), never a
/// concrete EF Core or JWT library type.
/// </summary>
public sealed class AuthService(
    IUserRepository userRepository,
    IPasswordHasher passwordHasher,
    IJwtTokenGenerator tokenGenerator,
    ISessionRepository sessionRepository,
    IDateTimeProvider dateTimeProvider
) : IAuthService
{
    public async Task<AuthResult> RegisterAsync(
        RegisterRequest request,
        string deviceLabel,
        string? ipAddress,
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

        return await BuildAuthResultAsync(user, deviceLabel, ipAddress, cancellationToken);
    }

    public async Task<AuthResult?> LoginAsync(
        LoginRequest request,
        string deviceLabel,
        string? ipAddress,
        CancellationToken cancellationToken = default
    )
    {
        var user = await userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (user is null || !passwordHasher.Verify(user.PasswordHash, request.Password))
        {
            return null;
        }

        return await BuildAuthResultAsync(user, deviceLabel, ipAddress, cancellationToken);
    }

    /// <summary>
    /// Creates the Session row and the JWT together, using the
    /// Session's own (already-generated) Id as the token's jti — this
    /// is the link the current-user middleware uses to revoke a live
    /// token early. The Session is added/saved BEFORE the token is
    /// handed back, so a session-validation check on the very next
    /// request always finds the row.
    /// </summary>
    private async Task<AuthResult> BuildAuthResultAsync(
        User user,
        string deviceLabel,
        string? ipAddress,
        CancellationToken cancellationToken
    )
    {
        var session = new Session
        {
            UserId = user.Id,
            DeviceLabel = deviceLabel,
            IpAddress = ipAddress,
        };

        var token = tokenGenerator.GenerateToken(user.Id, user.Email, session.Id);
        session.ExpiresAt = token.ExpiresAt;

        await sessionRepository.AddAsync(session, cancellationToken);
        await sessionRepository.SaveChangesAsync(cancellationToken);

        return new AuthResult(
            user.Id,
            user.Email,
            token.Value,
            token.ExpiresAt,
            user.Language,
            user.Theme,
            BuildAvatarDataUrl(user)
        );
    }

    private static string? BuildAvatarDataUrl(User user) =>
        user.AvatarData is not null && user.AvatarContentType is not null
            ? $"data:{user.AvatarContentType};base64,{Convert.ToBase64String(user.AvatarData)}"
            : null;

    public async Task UpdateLanguageAsync(Guid userId, string language, CancellationToken cancellationToken)
    {
        var user =
            await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");
        user.Language = language;
        await userRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateThemeAsync(Guid userId, string theme, CancellationToken cancellationToken)
    {
        var user =
            await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");
        user.Theme = theme;
        await userRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAvatarAsync(
        Guid userId,
        string avatarBase64,
        string contentType,
        CancellationToken cancellationToken
    )
    {
        var user =
            await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");
        user.AvatarData = Convert.FromBase64String(avatarBase64);
        user.AvatarContentType = contentType;
        await userRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task ChangePasswordAsync(
        Guid userId,
        Guid currentSessionId,
        string currentPassword,
        string newPassword,
        CancellationToken cancellationToken
    )
    {
        var user =
            await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        if (!passwordHasher.Verify(user.PasswordHash, currentPassword))
        {
            throw new UnauthorizedAccessException("Current password is incorrect.");
        }

        user.PasswordHash = passwordHasher.Hash(newPassword);

        var activeSessions = await sessionRepository.GetActiveAsync(cancellationToken);
        foreach (var session in activeSessions.Where(s => s.Id != currentSessionId))
        {
            var tracked =
                await sessionRepository.GetByIdAsync(session.Id, cancellationToken)
                ?? throw new InvalidOperationException("Session disappeared mid-revoke.");
            tracked.RevokedAt = dateTimeProvider.UtcNow;
        }

        // One SaveChangesAsync call persists both the password change and
        // every session revocation above — they're all tracked by the
        // same underlying AppDbContext instance (userRepository and
        // sessionRepository both wrap the one scoped DbContext for this
        // request).
        await userRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<SessionSummary>> GetSessionsAsync(
        Guid currentSessionId,
        CancellationToken cancellationToken
    )
    {
        var sessions = await sessionRepository.GetActiveAsync(cancellationToken);
        return sessions
            .OrderByDescending(s => s.LastActiveAt)
            .Select(s => new SessionSummary(
                s.Id,
                s.DeviceLabel,
                s.IpAddress,
                s.CreatedAt,
                s.LastActiveAt,
                s.Id == currentSessionId
            ))
            .ToList();
    }

    public async Task RevokeSessionAsync(Guid sessionToRevokeId, CancellationToken cancellationToken)
    {
        var session =
            await sessionRepository.GetByIdAsync(sessionToRevokeId, cancellationToken)
            ?? throw new InvalidOperationException("Session not found.");
        session.RevokedAt = dateTimeProvider.UtcNow;
        await sessionRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task RevokeOtherSessionsAsync(Guid currentSessionId, CancellationToken cancellationToken)
    {
        var activeSessions = await sessionRepository.GetActiveAsync(cancellationToken);
        foreach (var summary in activeSessions.Where(s => s.Id != currentSessionId))
        {
            var tracked =
                await sessionRepository.GetByIdAsync(summary.Id, cancellationToken)
                ?? throw new InvalidOperationException("Session disappeared mid-revoke.");
            tracked.RevokedAt = dateTimeProvider.UtcNow;
        }
        await sessionRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task LogoutAsync(Guid sessionId, CancellationToken cancellationToken)
    {
        var session = await sessionRepository.GetByIdAsync(sessionId, cancellationToken);
        if (session is null)
        {
            return; // Already gone/revoked — logging out is idempotent.
        }
        session.RevokedAt = dateTimeProvider.UtcNow;
        await sessionRepository.SaveChangesAsync(cancellationToken);
    }
}
```

(`GetActiveAsync` returns `AsNoTracking` results per Task 3's implementation — `ChangePasswordAsync`/`RevokeOtherSessionsAsync` re-fetch each session by id via the tracked `GetByIdAsync` before mutating, rather than mutating the untracked list directly, which would silently no-op on save.)

- [ ] **Step 4: Build to verify**

Run: `cd backend && dotnet build -c Release`
Expected: `Build succeeded. 0 Warning(s) 0 Error(s)` — this is where Task 5's intentionally-broken build gets fixed.

- [ ] **Step 5: Commit**

```bash
git add backend/SmartTask.Application/Auth/AuthContracts.cs backend/SmartTask.Application/Auth/IAuthService.cs backend/SmartTask.Application/Auth/AuthService.cs
git commit -m "feat(backend): avatar update, change password, and session management in AuthService"
```

---

### Task 7: Session-revocation check in the current-user middleware

**Files:**
- Modify: `backend/SmartTask.Api/Program.cs`

**Interfaces:**
- Consumes: `ISessionRepository` (Task 3), `ICurrentUserContext.SessionId` (Task 2).
- Produces: every authenticated request now gets rejected with `401` if its session has been revoked. This is what makes `DELETE /sessions/{id}`, `POST /sessions/revoke-others`, `POST /logout`, and "change password revokes other sessions" actually take effect immediately, not just update a database row nobody checks.

- [ ] **Step 1: Extend the existing middleware**

Find this block in `Program.cs` (added earlier for per-user data isolation):

```csharp
app.Use(
    async (context, next) =>
    {
        var userIdClaim = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdClaim, out var userId))
        {
            var currentUserContext = context.RequestServices.GetRequiredService<ICurrentUserContext>();
            currentUserContext.UserId = userId;
        }

        await next(context);
    }
);
```

Replace it with:

```csharp
app.Use(
    async (context, next) =>
    {
        var userIdClaim = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            await next(context);
            return;
        }

        var currentUserContext = context.RequestServices.GetRequiredService<ICurrentUserContext>();
        currentUserContext.UserId = userId;

        var jtiClaim = context.User.FindFirstValue(JwtRegisteredClaimNames.Jti);
        if (!Guid.TryParse(jtiClaim, out var sessionId))
        {
            // A token with no jti (shouldn't happen for tokens issued
            // after this change, but a token minted before this feature
            // existed has none) — treat it as having no active session
            // rather than throwing.
            await next(context);
            return;
        }

        var sessionRepository = context.RequestServices.GetRequiredService<ISessionRepository>();
        var session = await sessionRepository.GetByIdAsync(sessionId, context.RequestAborted);
        if (session is null || session.RevokedAt is not null)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        currentUserContext.SessionId = sessionId;

        if (DateTimeOffset.UtcNow - session.LastActiveAt > TimeSpan.FromMinutes(1))
        {
            session.LastActiveAt = DateTimeOffset.UtcNow;
            await sessionRepository.SaveChangesAsync(context.RequestAborted);
        }

        await next(context);
    }
);
```

Update the surrounding comment block (the `// CURRENT USER CONTEXT` header above it) to mention session validation too — replace:

```
// Must run after UseAuthentication/UseAuthorization — that's what
// populates HttpContext.User's claims. AppDbContext's query filter
// (see SmartTask.Persistence/AppDbContext.cs) reads this per request
// to scope every Task/Project/Goal/Habit/Notification query to the
// caller. Left null (never set) for unauthenticated requests — the
// filter then matches nothing, not everything.
```

with:

```
// Must run after UseAuthentication/UseAuthorization — that's what
// populates HttpContext.User's claims. AppDbContext's query filter
// (see SmartTask.Persistence/AppDbContext.cs) reads this per request
// to scope every Task/Project/Goal/Habit/Notification/Session query to
// the caller. Left null (never set) for unauthenticated requests — the
// filter then matches nothing, not everything. Also validates the
// request's session (see SmartTask.Domain.Auth.Session) hasn't been
// revoked — this is what makes Sign Out, changing your password, and
// revoking a session from Active Sessions actually take effect
// immediately instead of just updating a database row nobody checks.
```

- [ ] **Step 2: Add the missing `using` directive**

Add near the other `using` statements at the top of `Program.cs`:

```csharp
using SmartTask.Application.Auth;
```

(`System.Security.Claims` and `JwtRegisteredClaimNames`'s namespace, `System.IdentityModel.Tokens.Jwt`, are already imported by earlier work in this file — check both are present; add `using System.IdentityModel.Tokens.Jwt;` if `JwtRegisteredClaimNames` doesn't resolve.)

- [ ] **Step 3: Build to verify**

Run: `cd backend && dotnet build -c Release`
Expected: `Build succeeded. 0 Warning(s) 0 Error(s)`

- [ ] **Step 4: Commit**

```bash
git add backend/SmartTask.Api/Program.cs
git commit -m "feat(backend): reject requests whose session has been revoked"
```

---

### Task 8: `AuthController` — avatar, password, sessions, logout endpoints

**Files:**
- Modify: `backend/SmartTask.Api/Controllers/AuthController.cs`

**Interfaces:**
- Consumes: `IAuthService` (Task 6's full surface), `DeviceLabelParser.Parse` (Task 5), `ICurrentUserContext.SessionId` (Task 2).
- Produces: the actual HTTP surface Task 10 (`authApi.ts`) is written against. Exact routes/shapes below.

- [ ] **Step 1: Rewrite `AuthController.cs`**

```csharp
using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTask.Application.Abstractions;
using SmartTask.Application.Auth;

namespace SmartTask.Api.Controllers;

public sealed record AuthResponse(
    Guid UserId,
    string Email,
    string Token,
    DateTimeOffset ExpiresAt,
    string Language,
    string Theme,
    string? AvatarDataUrl
);

public sealed record UpdateLanguageRequest(string Language);

public sealed record UpdateThemeRequest(string Theme);

public sealed record SessionResponse(
    Guid Id,
    string DeviceLabel,
    string? IpAddress,
    DateTimeOffset CreatedAt,
    DateTimeOffset LastActiveAt,
    bool IsCurrent
);

/// <summary>
/// The real vertical slice for Phase 22, same idea as HealthController in
/// Phase 20: register → login → call a protected endpoint with the
/// issued Bearer token proves JwtBearer validation, DI, and the
/// Application/Infrastructure/Persistence split all actually work
/// together, not just "the code compiles."
/// </summary>
[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthService authService, ICurrentUserContext currentUserContext)
    : ControllerBase
{
    /// <summary>
    /// Min 8 chars, at least one lowercase, one uppercase, one digit — matches
    /// the client-side rules shown on the Register form's live checklist.
    /// Checked here (not in AuthService) to match this controller's existing
    /// pattern of validating request shape before calling the service, same
    /// as UpdateLanguage/UpdateTheme's allowed-value checks below.
    /// </summary>
    private static readonly Regex PasswordPolicy = new(
        @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$",
        RegexOptions.Compiled
    );

    private static readonly string[] AllowedAvatarContentTypes = ["image/jpeg", "image/png", "image/webp"];
    private const int MaxAvatarBytes = 1_500_000;

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken
    )
    {
        if (!PasswordPolicy.IsMatch(request.Password))
        {
            return BadRequest(
                new
                {
                    message = "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.",
                }
            );
        }

        try
        {
            var result = await authService.RegisterAsync(
                request,
                DeviceLabelParser.Parse(Request.Headers["User-Agent"].ToString()),
                GetClientIpAddress(),
                cancellationToken
            );
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
        var result = await authService.LoginAsync(
            request,
            DeviceLabelParser.Parse(Request.Headers["User-Agent"].ToString()),
            GetClientIpAddress(),
            cancellationToken
        );
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

    [Authorize]
    [HttpPatch("avatar")]
    public async Task<IActionResult> UpdateAvatar(
        UpdateAvatarRequest request,
        CancellationToken cancellationToken
    )
    {
        if (!AllowedAvatarContentTypes.Contains(request.ContentType))
        {
            return BadRequest(
                new { message = "Avatar must be image/jpeg, image/png, or image/webp." }
            );
        }

        byte[] decoded;
        try
        {
            decoded = Convert.FromBase64String(request.AvatarBase64);
        }
        catch (FormatException)
        {
            return BadRequest(new { message = "avatarBase64 is not valid base64." });
        }

        if (decoded.Length > MaxAvatarBytes)
        {
            return BadRequest(new { message = $"Avatar must be under {MaxAvatarBytes} bytes." });
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var parsedUserId))
        {
            return Unauthorized();
        }

        try
        {
            await authService.UpdateAvatarAsync(
                parsedUserId,
                request.AvatarBase64,
                request.ContentType,
                cancellationToken
            );
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }

        return NoContent();
    }

    [Authorize]
    [HttpPatch("password")]
    public async Task<IActionResult> ChangePassword(
        ChangePasswordRequest request,
        CancellationToken cancellationToken
    )
    {
        if (!PasswordPolicy.IsMatch(request.NewPassword))
        {
            return BadRequest(
                new
                {
                    message = "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.",
                }
            );
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var parsedUserId) || currentUserContext.SessionId is not { } sessionId)
        {
            return Unauthorized();
        }

        try
        {
            await authService.ChangePasswordAsync(
                parsedUserId,
                sessionId,
                request.CurrentPassword,
                request.NewPassword,
                cancellationToken
            );
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }

        return NoContent();
    }

    [Authorize]
    [HttpGet("sessions")]
    public async Task<ActionResult<List<SessionResponse>>> GetSessions(CancellationToken cancellationToken)
    {
        if (currentUserContext.SessionId is not { } sessionId)
        {
            return Unauthorized();
        }

        var sessions = await authService.GetSessionsAsync(sessionId, cancellationToken);
        return Ok(
            sessions
                .Select(s => new SessionResponse(
                    s.Id,
                    s.DeviceLabel,
                    s.IpAddress,
                    s.CreatedAt,
                    s.LastActiveAt,
                    s.IsCurrent
                ))
                .ToList()
        );
    }

    [Authorize]
    [HttpDelete("sessions/{id:guid}")]
    public async Task<IActionResult> RevokeSession(Guid id, CancellationToken cancellationToken)
    {
        if (currentUserContext.SessionId == id)
        {
            return BadRequest(new { message = "Sign out to end your own session." });
        }

        try
        {
            await authService.RevokeSessionAsync(id, cancellationToken);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }

        return NoContent();
    }

    [Authorize]
    [HttpPost("sessions/revoke-others")]
    public async Task<IActionResult> RevokeOtherSessions(CancellationToken cancellationToken)
    {
        if (currentUserContext.SessionId is not { } sessionId)
        {
            return Unauthorized();
        }

        await authService.RevokeOtherSessionsAsync(sessionId, cancellationToken);
        return NoContent();
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        if (currentUserContext.SessionId is { } sessionId)
        {
            await authService.LogoutAsync(sessionId, cancellationToken);
        }

        return NoContent();
    }

    /// <summary>Requires a valid Bearer token — proves [Authorize] + the JwtBearer middleware configured in Program.cs actually validate a real token, not just that one gets issued.</summary>
    [Authorize]
    [HttpGet("me")]
    public ActionResult<object> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = User.FindFirstValue(ClaimTypes.Email);
        return Ok(new { userId, email });
    }

    /// <summary>
    /// Railway terminates TLS and proxies over HTTP, so
    /// HttpContext.Connection.RemoteIpAddress is Railway's internal
    /// address, not the real client's — X-Forwarded-For (set by
    /// Railway's edge) has the real one when present.
    /// </summary>
    private string? GetClientIpAddress()
    {
        var forwardedFor = Request.Headers["X-Forwarded-For"].ToString();
        if (!string.IsNullOrWhiteSpace(forwardedFor))
        {
            return forwardedFor.Split(',')[0].Trim();
        }
        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }

    private static AuthResponse ToResponse(AuthResult result) =>
        new(
            result.UserId,
            result.Email,
            result.Token,
            result.ExpiresAt,
            result.Language,
            result.Theme,
            result.AvatarDataUrl
        );
}
```

- [ ] **Step 2: Build to verify**

Run: `cd backend && dotnet build -c Release`
Expected: `Build succeeded. 0 Warning(s) 0 Error(s)`

- [ ] **Step 3: Commit**

```bash
git add backend/SmartTask.Api/Controllers/AuthController.cs
git commit -m "feat(backend): add avatar/password/sessions/logout endpoints"
```

---

### Task 9: Backend end-to-end verification against a real database

**Files:** none (verification only — no code changes).

**Interfaces:**
- Consumes: everything from Tasks 1–8.

This task requires a reachable database (local MySQL, or the real Railway instance once this
branch is deployed there — whichever is available in the environment doing this task; if
neither is reachable, mark this task `DONE_WITH_CONCERNS` in its report, state plainly that
live verification could not run, and do NOT fabricate output — this mirrors how Task 5/7/9 of
the earlier per-user-isolation plan handled the same constraint).

- [ ] **Step 1: Register two accounts, confirm avatar starts null**

```bash
BASE=http://localhost:5277   # or the reachable instance's URL
curl -sS -X POST $BASE/api/auth/register -H "Content-Type: application/json" \
  -d '{"email":"avatar-test-a@example.com","password":"Test1234"}'
```

Expected: `200`, `"avatarDataUrl":null` in the response.

- [ ] **Step 2: Upload an avatar, confirm it round-trips**

```bash
TOKEN_A=<token from step 1>
# a tiny valid 1x1 PNG, base64-encoded
AVATAR_B64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
curl -sS -X PATCH $BASE/api/auth/avatar -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -d "{\"avatarBase64\":\"$AVATAR_B64\",\"contentType\":\"image/png\"}"
```

Expected: `204`. Then log in again with the same account and confirm `avatarDataUrl` starts with
`data:image/png;base64,`.

- [ ] **Step 3: Reject an oversized/invalid avatar**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -X PATCH $BASE/api/auth/avatar \
  -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -d '{"avatarBase64":"'"$AVATAR_B64"'","contentType":"image/gif"}'
```

Expected: `400` (disallowed content type).

- [ ] **Step 4: Change password revokes OTHER sessions, not the current one**

Log in a second time with the SAME account (simulating "device B") to get `TOKEN_A_DEVICE_B`.
Then, using the ORIGINAL `TOKEN_A`:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -X PATCH $BASE/api/auth/password \
  -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -d '{"currentPassword":"Test1234","newPassword":"NewTest1234"}'
```

Expected: `204`. Then:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" $BASE/api/auth/me -H "Authorization: Bearer $TOKEN_A"
curl -sS -o /dev/null -w "%{http_code}\n" $BASE/api/auth/me -H "Authorization: Bearer $TOKEN_A_DEVICE_B"
```

Expected: the first (the session that changed the password) is `200`; the second (device B's
session) is `401` — this is the Review Focus item for this task, do not skip it.

- [ ] **Step 5: Sessions list and revoke**

```bash
curl -sS $BASE/api/auth/sessions -H "Authorization: Bearer $TOKEN_A"
```

Expected: at least one entry with `"isCurrent":true` for `TOKEN_A`'s own session (device B's
session was already revoked in Step 4, so it won't appear — `GetActiveAsync` filters those out).

Log in a THIRD time to get a fresh `TOKEN_A_DEVICE_C`, then from `TOKEN_A`:

```bash
curl -sS $BASE/api/auth/sessions -H "Authorization: Bearer $TOKEN_A"
# copy device C's session id from the response as SESSION_C_ID
curl -sS -o /dev/null -w "%{http_code}\n" -X DELETE $BASE/api/auth/sessions/$SESSION_C_ID -H "Authorization: Bearer $TOKEN_A"
curl -sS -o /dev/null -w "%{http_code}\n" $BASE/api/auth/me -H "Authorization: Bearer $TOKEN_A_DEVICE_C"
```

Expected: the `DELETE` is `204`, and device C's next request is `401`.

- [ ] **Step 6: Can't revoke your own current session**

```bash
CURRENT_SESSION_ID=<TOKEN_A's own session id from the sessions list above>
curl -sS -o /dev/null -w "%{http_code}\n" -X DELETE $BASE/api/auth/sessions/$CURRENT_SESSION_ID -H "Authorization: Bearer $TOKEN_A"
```

Expected: `400`.

- [ ] **Step 7: Logout revokes the session immediately**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -X POST $BASE/api/auth/logout -H "Authorization: Bearer $TOKEN_A"
curl -sS -o /dev/null -w "%{http_code}\n" $BASE/api/auth/me -H "Authorization: Bearer $TOKEN_A"
```

Expected: the logout call is `204`, and the SAME token immediately gets `401` on the next
request — this is the plan's first Review Focus item, do not skip it.

- [ ] **Step 8: Report results**

Write the actual status codes observed for every step above into this task's report — do not
summarize as "all passed" without the literal codes, per this project's established "evidence
before assertions" practice.

---

### Task 10: `authApi.ts` — new API functions

**Files:**
- Modify: `packages/api-client/src/authApi.ts`

**Interfaces:**
- Consumes: the endpoints from Task 8.
- Produces: `authApi.updateAvatar(avatarBase64, contentType)`, `authApi.changePassword(currentPassword, newPassword)`, `authApi.listSessions()`, `authApi.revokeSession(id)`, `authApi.revokeOtherSessions()`, `authApi.logout()`, and `AuthResponse` gaining `avatarDataUrl: string | null`. Task 11 (`AuthContext`) and Task 13 (`AccountSettingsPage`) both call these exact names.

- [ ] **Step 1: Rewrite `authApi.ts`**

```typescript
import { httpClient } from './httpClient';

export interface AuthResponse {
  userId: string;
  email: string;
  token: string;
  expiresAt: string;
  language: string;
  theme: string;
  avatarDataUrl: string | null;
}

export interface SessionResponse {
  id: string;
  deviceLabel: string;
  ipAddress: string | null;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

/** Matches SmartTask.Api's AuthController exactly. */
export const authApi = {
  register: (email: string, password: string, displayName?: string): Promise<AuthResponse> =>
    httpClient.post<AuthResponse>('/api/auth/register', { email, password, displayName }),
  login: (email: string, password: string): Promise<AuthResponse> =>
    httpClient.post<AuthResponse>('/api/auth/login', { email, password }),
  updateLanguage: (language: 'vi' | 'en'): Promise<void> =>
    httpClient.patch<void>('/api/auth/language', { language }),
  updateTheme: (theme: 'light' | 'dark'): Promise<void> =>
    httpClient.patch<void>('/api/auth/theme', { theme }),
  updateAvatar: (avatarBase64: string, contentType: string): Promise<void> =>
    httpClient.patch<void>('/api/auth/avatar', { avatarBase64, contentType }),
  changePassword: (currentPassword: string, newPassword: string): Promise<void> =>
    httpClient.patch<void>('/api/auth/password', { currentPassword, newPassword }),
  listSessions: (): Promise<SessionResponse[]> => httpClient.get<SessionResponse[]>('/api/auth/sessions'),
  revokeSession: (id: string): Promise<void> => httpClient.delete(`/api/auth/sessions/${id}`),
  revokeOtherSessions: (): Promise<void> =>
    httpClient.post<void>('/api/auth/sessions/revoke-others', undefined),
  logout: (): Promise<void> => httpClient.post<void>('/api/auth/logout', undefined),
};
```

- [ ] **Step 2: Build to verify**

Run: `cd /e/SmartTaskManager && npx tsc -b --pretty`
Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add packages/api-client/src/authApi.ts
git commit -m "feat(api-client): add avatar/password/sessions/logout functions"
```

---

### Task 11: `AuthContext` — avatar state, async logout, extracted password rules

**Files:**
- Create: `packages/app-core/src/lib/passwordRules.ts`
- Modify: `packages/app-core/src/state/AuthContext.tsx`
- Modify: `packages/app-core/src/pages/Auth/LoginPage.tsx`

**Interfaces:**
- Consumes: `authApi.updateAvatar`/`logout` (Task 10).
- Produces: `passwordRules.ts` exports `PasswordRule` (type) and `PASSWORD_RULES` (array) — Task 12 (`PasswordStrengthChecklist`) and `LoginPage.tsx` both import from here. `AuthContext` gains `avatarDataUrl: string | null` and `setAvatar: (base64: string, contentType: string) => Promise<void>`; `logout` becomes `async () => Promise<void>`.

- [ ] **Step 1: Create `passwordRules.ts`**

Move this exact code (currently inline near the top of `LoginPage.tsx`) into the new file:

```typescript
export interface PasswordRule {
  key: string;
  labelKey: string;
  test: (password: string) => boolean;
}

/** Mirrors the backend's PasswordPolicy regex in AuthController.cs exactly — keep both in sync. */
export const PASSWORD_RULES: PasswordRule[] = [
  { key: 'length', labelKey: 'auth.passwordRuleLength', test: (p) => p.length >= 8 },
  { key: 'uppercase', labelKey: 'auth.passwordRuleUppercase', test: (p) => /[A-Z]/.test(p) },
  { key: 'lowercase', labelKey: 'auth.passwordRuleLowercase', test: (p) => /[a-z]/.test(p) },
  { key: 'number', labelKey: 'auth.passwordRuleNumber', test: (p) => /\d/.test(p) },
];
```

- [ ] **Step 2: Update `LoginPage.tsx` to import from there instead of defining its own copy**

Replace:

```typescript
interface PasswordRule {
  key: string;
  labelKey: string;
  test: (password: string) => boolean;
}

/** Mirrors the backend's PasswordPolicy regex in AuthController.cs exactly — keep both in sync. */
const PASSWORD_RULES: PasswordRule[] = [
  { key: 'length', labelKey: 'auth.passwordRuleLength', test: (p) => p.length >= 8 },
  { key: 'uppercase', labelKey: 'auth.passwordRuleUppercase', test: (p) => /[A-Z]/.test(p) },
  { key: 'lowercase', labelKey: 'auth.passwordRuleLowercase', test: (p) => /[a-z]/.test(p) },
  { key: 'number', labelKey: 'auth.passwordRuleNumber', test: (p) => /\d/.test(p) },
];
```

with:

```typescript
import { PASSWORD_RULES } from '../../lib/passwordRules';
```

(placed alongside `LoginPage.tsx`'s other imports, not where the deleted block was).

- [ ] **Step 3: Rewrite `AuthContext.tsx`**

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
  avatarDataUrl: string | null;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  email: string | null;
  theme: string | null;
  avatarDataUrl: string | null;
  /** True only while reading localStorage on first mount — not for login/register's own in-flight state, that's each form's own concern. */
  isHydrating: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  setLanguage: (language: 'vi' | 'en') => Promise<void>;
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
  setAvatar: (avatarBase64: string, contentType: string) => Promise<void>;
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
      avatarDataUrl: result.avatarDataUrl,
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
      avatarDataUrl: result.avatarDataUrl,
    });
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch (error) {
      // A failed revoke call must never trap the user in a "logged in"
      // UI they can't leave — log it and proceed with local sign-out
      // regardless.
      console.error('Failed to revoke session on logout:', error);
    }
    // Deliberately leaves the `dark` class / stm.theme in place — the
    // login screen keeps the last-used theme (LoginPage's own fallback
    // reads stm.theme), and persist() re-applies the next user's real
    // theme on their next login.
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

  async function setAvatar(avatarBase64: string, contentType: string) {
    await authApi.updateAvatar(avatarBase64, contentType);
    const avatarDataUrl = `data:${contentType};base64,${avatarBase64}`;
    if (auth) {
      persist({ ...auth, avatarDataUrl });
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: auth !== null,
        email: auth?.email ?? null,
        theme: auth?.theme ?? null,
        avatarDataUrl: auth?.avatarDataUrl ?? null,
        isHydrating,
        login,
        register,
        logout,
        setLanguage,
        setTheme,
        setAvatar,
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

- [ ] **Step 4: Fix `logout` callers now that it's async**

`packages/app-core/src/app/AppShell.tsx` currently passes `onSignOutClick={logout}` directly to
`Topbar`. `Topbar`'s `onSignOutClick` prop is typed `() => void`, and a `() => Promise<void>`
is assignable to that in TypeScript (a function returning a Promise satisfies a `void`-returning
callback type — the caller just doesn't await it), so no signature change is needed there. Confirm
this compiles as-is in Step 5; if it doesn't, wrap it as `onSignOutClick={() => void logout()}`
instead.

- [ ] **Step 5: Build to verify**

Run: `cd /e/SmartTaskManager && npx tsc -b --pretty`
Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add packages/app-core/src/lib/passwordRules.ts packages/app-core/src/state/AuthContext.tsx packages/app-core/src/pages/Auth/LoginPage.tsx
git commit -m "feat(app-core): avatar state and async logout in AuthContext, extract password rules"
```

---

### Task 12: `PasswordStrengthChecklist` shared component

**Files:**
- Create: `packages/ui/src/components/PasswordStrengthChecklist/PasswordStrengthChecklist.tsx`
- Create: `packages/ui/src/components/PasswordStrengthChecklist/index.ts`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/app-core/src/pages/Auth/LoginPage.tsx`

**Interfaces:**
- Consumes: `PASSWORD_RULES` (Task 11).
- Produces: `<PasswordStrengthChecklist password={string} rules={PasswordRule[]} labels={(labelKey: string) => string} />` — Task 13 (`AccountSettingsPage`'s Security section) uses this exact component instead of duplicating the `<ul>` markup.

- [ ] **Step 1: Create `PasswordStrengthChecklist.tsx`**

`packages/ui` must not depend on `packages/app-core` (that would invert the dependency direction
this monorepo uses everywhere: `app-core` depends on `ui`, never the reverse). So
`PasswordStrengthChecklist` takes the already-evaluated rule results as a plain prop, with no
dependency on `passwordRules.ts` at all:

```typescript
export interface PasswordRuleResult {
  key: string;
  label: string;
  met: boolean;
}

export interface PasswordStrengthChecklistProps {
  results: PasswordRuleResult[];
}

/**
 * Pure presentational checklist — the caller computes each rule's met/
 * unmet state (packages/app-core's passwordRules.ts + i18n translation)
 * and passes the results in. Keeps packages/ui free of any dependency
 * on packages/app-core (the dependency direction is the other way
 * everywhere else in this monorepo).
 */
export function PasswordStrengthChecklist({ results }: PasswordStrengthChecklistProps) {
  return (
    <ul className="flex flex-col gap-1 rounded-md bg-surface-secondary p-3">
      {results.map((rule) => (
        <li
          key={rule.key}
          className={'text-xs ' + (rule.met ? 'text-success' : 'text-ink-muted')}
        >
          {rule.met ? '✓' : '○'} {rule.label}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Create `index.ts`**

```typescript
export {
  PasswordStrengthChecklist,
  type PasswordStrengthChecklistProps,
  type PasswordRuleResult,
} from './PasswordStrengthChecklist';
```

- [ ] **Step 3: Export it from `packages/ui/src/index.ts`**

Add after the `NotificationPanel` export block:

```typescript
export {
  PasswordStrengthChecklist,
  type PasswordStrengthChecklistProps,
  type PasswordRuleResult,
} from './components/PasswordStrengthChecklist';
```

- [ ] **Step 4: Use it in `LoginPage.tsx`**, replacing the inline `<ul>` it currently renders for
the password checklist. Find this block:

```tsx
              <ul className="flex flex-col gap-1 rounded-md bg-surface-secondary p-3">
                {passwordRuleResults.map((rule) => (
                  <li
                    key={rule.key}
                    className={'text-xs ' + (rule.met ? 'text-success' : 'text-ink-muted')}
                  >
                    {rule.met ? '✓' : '○'} {t(rule.labelKey)}
                  </li>
                ))}
              </ul>
```

Replace it with:

```tsx
              <PasswordStrengthChecklist
                results={passwordRuleResults.map((rule) => ({
                  key: rule.key,
                  label: t(rule.labelKey),
                  met: rule.met,
                }))}
              />
```

Add `PasswordStrengthChecklist` to `LoginPage.tsx`'s existing `import { Button } from '@stm/ui';`
line (`import { Button, PasswordStrengthChecklist } from '@stm/ui';`). `passwordRuleResults` is
already computed exactly this way earlier in `LoginPage.tsx` (`useMemo` mapping `PASSWORD_RULES`
to `{ ...rule, met: rule.test(password) }`) — unchanged by this task.

- [ ] **Step 5: Build to verify**

Run: `cd /e/SmartTaskManager && npx tsc -b --pretty`
Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/components/PasswordStrengthChecklist packages/ui/src/index.ts packages/app-core/src/pages/Auth/LoginPage.tsx
git commit -m "feat(ui): extract PasswordStrengthChecklist, reuse it in LoginPage"
```

---

### Task 13: `AccountSettingsPage` rewrite — Profile (avatar), Security, Active Sessions

**Files:**
- Modify: `packages/app-core/src/pages/AccountSettings/AccountSettingsPage.tsx`
- Modify: `packages/app-core/src/i18n/locales/vi.json`
- Modify: `packages/app-core/src/i18n/locales/en.json`

**Interfaces:**
- Consumes: `useAuthContext().avatarDataUrl`/`setAvatar` (Task 11), `authApi.changePassword`/`listSessions`/`revokeSession`/`revokeOtherSessions` (Task 10), `PasswordStrengthChecklist` (Task 12), `PASSWORD_RULES` (Task 11).

- [ ] **Step 1: Add the new i18n keys**

In `packages/app-core/src/i18n/locales/vi.json`, inside the existing `"accountSettings"` object,
add (keeping `title`/`subtitle`/`emailLabel` that are already there):

```json
  "accountSettings": {
    "title": "Cài đặt tài khoản",
    "subtitle": "Thông tin đăng nhập và tùy chọn cá nhân gắn với tài khoản này.",
    "emailLabel": "Email",
    "changePhoto": "Đổi ảnh đại diện",
    "avatarTooLarge": "Ảnh quá lớn sau khi nén, vui lòng chọn ảnh khác.",
    "avatarInvalidType": "Chỉ chấp nhận ảnh JPEG, PNG hoặc WEBP.",
    "securityTitle": "Bảo mật",
    "securitySubtitle": "Đổi mật khẩu đăng nhập của bạn.",
    "currentPasswordLabel": "Mật khẩu hiện tại",
    "newPasswordLabel": "Mật khẩu mới",
    "confirmNewPasswordLabel": "Xác nhận mật khẩu mới",
    "updatePasswordButton": "Cập nhật mật khẩu",
    "passwordUpdated": "Đã đổi mật khẩu thành công.",
    "wrongCurrentPassword": "Mật khẩu hiện tại không đúng.",
    "sessionsTitle": "Thiết bị đăng nhập",
    "sessionsSubtitle": "Các thiết bị đang đăng nhập vào tài khoản của bạn.",
    "thisDevice": "Thiết bị này",
    "revoke": "Thu hồi",
    "revokeOthers": "Đăng xuất khỏi mọi thiết bị khác",
    "activeNow": "Đang hoạt động"
  },
```

In `packages/app-core/src/i18n/locales/en.json`, the matching English:

```json
  "accountSettings": {
    "title": "Account Settings",
    "subtitle": "Login details and personal preferences tied to this account.",
    "emailLabel": "Email",
    "changePhoto": "Change photo",
    "avatarTooLarge": "Image is still too large after compression — try a different one.",
    "avatarInvalidType": "Only JPEG, PNG, or WEBP images are accepted.",
    "securityTitle": "Security",
    "securitySubtitle": "Change your account password.",
    "currentPasswordLabel": "Current password",
    "newPasswordLabel": "New password",
    "confirmNewPasswordLabel": "Confirm new password",
    "updatePasswordButton": "Update Password",
    "passwordUpdated": "Password updated successfully.",
    "wrongCurrentPassword": "Current password is incorrect.",
    "sessionsTitle": "Active Sessions",
    "sessionsSubtitle": "Devices currently signed in to your account.",
    "thisDevice": "This device",
    "revoke": "Revoke",
    "revokeOthers": "Sign out of all other sessions",
    "activeNow": "Active now"
  },
```

- [ ] **Step 2: Rewrite `AccountSettingsPage.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { UserCog, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authApi, ApiError, type SessionResponse } from '@stm/api-client';
import { Switch, PasswordStrengthChecklist } from '@stm/ui';
import { useAuthContext } from '../../state/AuthContext';
import { PASSWORD_RULES } from '../../lib/passwordRules';

const fieldClasses =
  'w-full rounded-md border border-border bg-surface px-3 py-2 pr-10 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary';
const plainFieldClasses =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary';
const readOnlyFieldClasses =
  'w-full rounded-md border border-border bg-surface-secondary px-3 py-2 text-sm text-ink-secondary';
const labelClasses = 'text-xs font-semibold uppercase tracking-wide text-ink-muted';
const sectionCardClasses = 'flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm';

const MAX_AVATAR_BYTES = 1_500_000;
const AVATAR_CANVAS_SIZE = 256;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Draws `file` onto a square canvas (center-cropped, resized to AVATAR_CANVAS_SIZE) and returns a base64 JPEG — keeps every upload small regardless of the source photo's size. */
async function resizeAvatarToBase64(file: File): Promise<string> {
  const imageBitmap = await createImageBitmap(file);
  const side = Math.min(imageBitmap.width, imageBitmap.height);
  const sx = (imageBitmap.width - side) / 2;
  const sy = (imageBitmap.height - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_CANVAS_SIZE;
  canvas.height = AVATAR_CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.drawImage(imageBitmap, sx, sy, side, side, 0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return dataUrl.split(',')[1] ?? '';
}

function formatRelativeTime(iso: string, activeNowLabel: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 2 * 60 * 1000) return activeNowLabel;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AccountSettingsPage() {
  const { t, i18n } = useTranslation();
  const { email, avatarDataUrl, setAvatar, setLanguage, theme, setTheme } = useAuthContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const passwordRuleResults = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(newPassword) })),
    [newPassword],
  );
  const isNewPasswordValid = passwordRuleResults.every((rule) => rule.met);
  const passwordsMatch = newPassword === confirmNewPassword;
  const canSubmitPassword =
    currentPassword.length > 0 && isNewPasswordValid && passwordsMatch && !isChangingPassword;

  async function loadSessions() {
    setSessionsLoading(true);
    try {
      const list = await authApi.listSessions();
      setSessions(list);
    } finally {
      setSessionsLoading(false);
    }
  }

  useEffect(() => {
    void loadSessions();
  }, []);

  async function handleAvatarFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setAvatarError(null);
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError(t('accountSettings.avatarInvalidType'));
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const base64 = await resizeAvatarToBase64(file);
      const byteLength = Math.ceil((base64.length * 3) / 4);
      if (byteLength > MAX_AVATAR_BYTES) {
        setAvatarError(t('accountSettings.avatarTooLarge'));
        return;
      }
      await setAvatar(base64, 'image/jpeg');
    } catch (error) {
      setAvatarError(error instanceof ApiError ? error.message : t('accountSettings.avatarTooLarge'));
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    setIsChangingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      void loadSessions();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setPasswordError(t('accountSettings.wrongCurrentPassword'));
      } else {
        setPasswordError(error instanceof ApiError ? error.message : t('auth.genericError'));
      }
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleRevoke(id: string) {
    await authApi.revokeSession(id);
    void loadSessions();
  }

  async function handleRevokeOthers() {
    await authApi.revokeOtherSessions();
    void loadSessions();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
          <UserCog className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">
            {t('accountSettings.title')}
          </h1>
          <p className="text-sm text-ink-secondary">{t('accountSettings.subtitle')}</p>
        </div>
      </header>

      {/* Profile */}
      <section className={sectionCardClasses}>
        <div className="flex items-center gap-4">
          {avatarDataUrl ? (
            <img
              src={avatarDataUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white">
              {(email ?? '?').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="self-start text-sm font-medium text-primary hover:underline disabled:opacity-50"
            >
              {t('accountSettings.changePhoto')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => void handleAvatarFileChange(event)}
              className="hidden"
            />
            {avatarError && <p className="text-xs text-danger">{avatarError}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor="account-settings-email" className={labelClasses}>
              {t('accountSettings.emailLabel')}
            </label>
            <input
              id="account-settings-email"
              type="email"
              value={email ?? ''}
              readOnly
              className={readOnlyFieldClasses}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="account-settings-language" className={labelClasses}>
              {t('settings.language')}
            </label>
            <select
              id="account-settings-language"
              value={i18n.language}
              onChange={(event) => void setLanguage(event.target.value as 'vi' | 'en')}
              className={plainFieldClasses}
            >
              <option value="vi">{t('settings.languageVi')}</option>
              <option value="en">{t('settings.languageEn')}</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="account-settings-dark-mode" className={labelClasses}>
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
        </div>
      </section>

      {/* Security */}
      <section className={sectionCardClasses}>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-ink-primary">{t('accountSettings.securityTitle')}</h2>
          <p className="text-sm text-ink-secondary">{t('accountSettings.securitySubtitle')}</p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="account-settings-current-password" className={labelClasses}>
              {t('accountSettings.currentPasswordLabel')}
            </label>
            <div className="relative">
              <input
                id="account-settings-current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className={fieldClasses}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((current) => !current)}
                aria-label={showCurrentPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted hover:text-ink-secondary"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="account-settings-new-password" className={labelClasses}>
              {t('accountSettings.newPasswordLabel')}
            </label>
            <div className="relative">
              <input
                id="account-settings-new-password"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className={fieldClasses}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((current) => !current)}
                aria-label={showNewPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted hover:text-ink-secondary"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <PasswordStrengthChecklist
            results={passwordRuleResults.map((rule) => ({
              key: rule.key,
              label: t(rule.labelKey),
              met: rule.met,
            }))}
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="account-settings-confirm-new-password" className={labelClasses}>
              {t('accountSettings.confirmNewPasswordLabel')}
            </label>
            <input
              id="account-settings-confirm-new-password"
              type={showNewPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              className={plainFieldClasses}
            />
            {confirmNewPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-danger">{t('auth.passwordMismatch')}</p>
            )}
          </div>

          {passwordError && <p className="text-sm text-danger">{passwordError}</p>}
          {passwordSuccess && <p className="text-sm text-success">{t('accountSettings.passwordUpdated')}</p>}

          <button
            type="submit"
            disabled={!canSubmitPassword}
            className="self-start rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {t('accountSettings.updatePasswordButton')}
          </button>
        </form>
      </section>

      {/* Active Sessions */}
      <section className={sectionCardClasses}>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-ink-primary">{t('accountSettings.sessionsTitle')}</h2>
          <p className="text-sm text-ink-secondary">{t('accountSettings.sessionsSubtitle')}</p>
        </div>

        {!sessionsLoading && (
          <div className="flex flex-col divide-y divide-border">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-ink-primary">
                    {session.deviceLabel}
                    {session.ipAddress ? ` · ${session.ipAddress}` : ''}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {formatRelativeTime(session.lastActiveAt, t('accountSettings.activeNow'))}
                  </span>
                </div>
                {session.isCurrent ? (
                  <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary">
                    {t('accountSettings.thisDevice')}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleRevoke(session.id)}
                    className="text-sm font-medium text-danger hover:underline"
                  >
                    {t('accountSettings.revoke')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {sessions.some((s) => !s.isCurrent) && (
          <button
            type="button"
            onClick={() => void handleRevokeOthers()}
            className="self-start text-sm font-medium text-danger hover:underline"
          >
            {t('accountSettings.revokeOthers')}
          </button>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Confirm `SessionResponse` and `ApiError` are exported from `@stm/api-client`**

Check `packages/api-client/src/index.ts` — `ApiError` is already exported (Task doesn't need to
touch it); `SessionResponse` needs adding since Task 10 only defined it inside `authApi.ts`. Add
this line to `packages/api-client/src/index.ts`:

```typescript
export { authApi, type AuthResponse, type SessionResponse } from './authApi';
```

(replacing the existing `export { authApi, type AuthResponse } from './authApi';` line).

- [ ] **Step 4: Build to verify**

Run: `cd /e/SmartTaskManager && npx tsc -b --pretty`
Expected: no output (clean).

- [ ] **Step 5: Commit**

```bash
git add packages/app-core/src/pages/AccountSettings/AccountSettingsPage.tsx packages/app-core/src/i18n/locales/vi.json packages/app-core/src/i18n/locales/en.json packages/api-client/src/index.ts
git commit -m "feat(account-settings): avatar upload, change password, and active sessions UI"
```

---

### Task 14: Full verification, build both apps, update ROADMAP

**Files:**
- Modify: `docs/roadmap/ROADMAP.md`

**Interfaces:**
- Consumes: everything from Tasks 1–13.

- [ ] **Step 1: Full backend build**

Run: `cd backend && dotnet build -c Release`
Expected: `Build succeeded. 0 Warning(s) 0 Error(s)`

- [ ] **Step 2: Full frontend typecheck**

Run: `cd /e/SmartTaskManager && npx tsc -b --pretty`
Expected: no output (clean).

- [ ] **Step 3: Build both frontend apps**

```bash
cd /e/SmartTaskManager
npm run build:tauri
npm run build:web
```

Expected: both succeed.

- [ ] **Step 4: Manual UI smoke test, if a browser/running app is available**

Open Account Settings (via the Topbar account menu → Account Settings). Upload a small photo,
confirm the avatar updates in both the page and the Topbar's account button. Type a wrong current
password and submit — confirm the inline error appears. Type a valid new password + matching
confirmation and submit — confirm the success message appears and the sessions list still shows
the current session (unaffected). If no browser/running app is available in this environment,
state so plainly in the report rather than claiming this was checked.

- [ ] **Step 5: Update ROADMAP.md**

Add a new non-numbered entry `Account Settings v2 (avatar, đổi mật khẩu, sessions) đã thực hiện`
matching this project's established format (see the "Per-user data isolation đã thực hiện" entry
for the style), documenting:
- What shipped: avatar upload (BLOB in MySQL, client-side resize to 256×256 JPEG before upload),
  change password (revokes other sessions), Active Sessions list with per-session revoke and
  "sign out of all others".
- The architectural note: JWTs are no longer purely stateless — the `jti` claim now maps 1:1 to a
  `Sessions` row, checked on every authenticated request, so a session can be revoked before its
  natural 60-minute expiry.
- What was actually verified (Task 9's real curl output, Task 14's real build output) vs. what
  could not be verified in this environment (e.g. no browser to click through, if that was the
  case) — following this project's established rule of never claiming untested behavior works.
- Explicitly out of scope this round (confirmed with the user): Delete Account, 2FA, Notifications
  tab, Connected Apps, GeoIP-based location display.

- [ ] **Step 6: Commit**

```bash
git add docs/roadmap/ROADMAP.md
git commit -m "docs: record Account Settings v2 rollout in ROADMAP.md"
```
