# Account Settings v2 — Avatar, Change Password, Active Sessions

## Context

The Account Settings page (added earlier this project) currently only holds Language and Theme.
The user wants it upgraded to match a reference mockup (`docs/design-system/references/FRAME 02C
— ACCOUNT SETTINGS.png`) with three real, working features: an editable avatar, a change-password
form, and a list of active login sessions with the ability to revoke them. Role/Department, 2FA,
a Notifications tab, Connected Apps, and Delete Account (also shown in the mockup) are explicitly
**out of scope** for this round — confirmed with the user.

## Scope decisions (confirmed with the user)

- **Avatar storage**: stored as a BLOB directly in MySQL (`Users` table) — no external storage
  service, no new credentials to manage, survives Railway redeploys (unlike local disk, which is
  ephemeral there).
- **Active Sessions device location**: shows IP address + a device label parsed from the
  `User-Agent` header (e.g. "Chrome on Windows") — no GeoIP lookup service, no external dependency.
- **Out of scope this round**: Delete Account, Two-Factor Authentication, Notifications tab,
  Connected Apps.

## The architectural shift this requires

Today, JWTs are fully stateless: `Program.cs` validates the signature and expiry, and nothing
else — there is no way to invalidate a token before it naturally expires (60 minutes, from
`Jwt:ExpiryMinutes`). A real "Active Sessions" list with a working "Revoke" button needs the
opposite: a way to know a token is still allowed, checked on every authenticated request.

This is done by introducing a `Sessions` table and reusing the JWT's own `jti` (JWT ID) claim —
already generated per-token today but never stored — as that session's primary key. Login/Register
creates one `Session` row per issued token; a new step in the existing current-user middleware
looks up that row on every authenticated request and rejects the request (401) if it's been
revoked. No refresh-token flow is being added — token issuance/expiry behavior is unchanged, this
only adds the ability to invalidate a live token early.

**Performance note**: this converts every authenticated request from zero auth-related DB access
to one extra row lookup (session validity) plus an occasional write (updating `LastActiveAt`,
throttled — see below). At this app's personal/single-tenant scale this is a non-issue; it would
need revisiting only if the app grew into a very different (high-throughput, multi-tenant) load
profile, which is not this app's trajectory.

## Data model changes

### `User` (existing entity) — 2 new columns

```csharp
public byte[]? AvatarData { get; set; }
public string? AvatarContentType { get; set; }   // "image/jpeg", "image/png", or "image/webp"
```

Both null until the user uploads an avatar. No size column needed — `AvatarData.Length` is enough
if ever inspected; the real cap is enforced in the controller (see below), not the database.

### `Session` (new entity, `SmartTask.Domain/Auth/Session.cs`)

```csharp
public sealed class Session : Entity
{
    public Guid UserId { get; set; }
    public required string DeviceLabel { get; set; }   // e.g. "Chrome on Windows"
    public string? IpAddress { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastActiveAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
}
```

`Session.Id` (inherited from `Entity`) is generated as normal (`Guid.NewGuid()` in the base class)
— but crucially, **`JwtTokenGenerator` must use that same value as the token's `jti` claim**,
so the two are the same GUID. `ExpiresAt` mirrors the JWT's own expiry (`Jwt:ExpiryMinutes` from
issuance time) — used only to hide naturally-stale rows from the "Active Sessions" list; it plays
no role in request authorization (the JWT's own signature/expiry check already rejects an expired
token before the session-revocation check ever runs).

`Session` participates in the existing per-user data isolation mechanism (`AppDbContext`'s global
query filter and auto-assign-on-insert, added for Tasks/Projects/Goals/Habits/Notifications) —
consistent with every other user-owned table, and it costs nothing extra to wire in. One
exception: at login/register time there is no authenticated request yet (`ICurrentUserContext.UserId`
is still null), so `AuthService` sets `Session.UserId` explicitly when creating the row, the same
way `RegisterAsync` already sets `User.Email` explicitly — the auto-assign path in
`SaveChangesAsync` is simply a no-op there (its `if (currentUserId is not null)` guard skips it).

### `ICurrentUserContext` — one new property

```csharp
public interface ICurrentUserContext
{
    Guid? UserId { get; set; }
    Guid? SessionId { get; set; }   // NEW — this request's session (= the JWT's jti), once resolved
}
```

Set alongside `UserId` by the existing current-user middleware in `Program.cs`. Endpoints that
need to know "which session is this request" (change password, list/revoke sessions) read it from
here instead of re-parsing the JWT's claims themselves.

## Request pipeline changes

`Program.cs`'s existing current-user middleware (added for per-user data isolation) is extended
in place — not replaced — to also resolve and validate the session:

```csharp
app.Use(async (context, next) =>
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

    // Avoid a write on every single request — only touch it once a minute.
    if (DateTimeOffset.UtcNow - session.LastActiveAt > TimeSpan.FromMinutes(1))
    {
        session.LastActiveAt = DateTimeOffset.UtcNow;
        await sessionRepository.SaveChangesAsync(context.RequestAborted);
    }

    await next(context);
});
```

A request with no `NameIdentifier` claim (unauthenticated) or no `jti` claim (a token minted
before this change, or malformed) is left alone — this matches the existing fail-closed design:
`AppDbContext`'s query filter already returns nothing for `ICurrentUserContext.UserId == null`,
and any `[Authorize]` endpoint still requires `ClaimTypes.NameIdentifier` regardless. A revoked
session actively rejects the request (401) rather than silently falling through.

## New endpoints (all under `/api/auth`, all `[Authorize]`)

| Method & path | Request | Response | Notes |
|---|---|---|---|
| `PATCH /avatar` | `{ avatarBase64: string, contentType: string }` | `204` | `contentType` must be one of `image/jpeg`, `image/png`, `image/webp`; decoded byte length capped at 1,500,000 bytes (~1.4 MB) — matches the client-side resize step below, generous headroom for it. Over the cap or wrong content type → `400`. |
| `PATCH /password` | `{ currentPassword: string, newPassword: string }` | `204` | `currentPassword` must verify via `IPasswordHasher.Verify`, else `401`. `newPassword` must pass the same `PasswordPolicy` regex already enforced at registration, else `400`. On success, revokes every OTHER session for this user (not the one making the request) — a password change is a security-relevant event; other devices should re-authenticate. |
| `GET /sessions` | — | `[{ id, deviceLabel, ipAddress, createdAt, lastActiveAt, isCurrent }]` | Only rows where `RevokedAt == null && ExpiresAt > now`. `isCurrent` compares each row's `id` against `ICurrentUserContext.SessionId`. |
| `DELETE /sessions/{id}` | — | `204` | Revokes one session. `400` if `id` equals the caller's own current session (revoking your own live session is what Sign Out is for, not this). `404` if the id doesn't exist or isn't owned by the caller (the query filter already makes "not owned" indistinguishable from "doesn't exist" — consistent with every other entity in this app). |
| `POST /sessions/revoke-others` | — | `204` | Revokes every non-revoked session for this user except the current one. Matches the mockup's "Sign out of all other sessions". |
| `POST /logout` | — | `204` | New. Revokes the CURRENT session server-side. The frontend's existing local-only logout (clearing `localStorage`) now calls this first — otherwise a "logged out" token would still show up as an active session and would still work if replayed. |

`GET /me` is unchanged. `Register`/`Login` responses (`AuthResponse`) gain two new fields:
`avatarDataUrl: string | null` (a ready-to-use `data:image/...;base64,...` URI, or `null` if no
avatar set — computed server-side from `AvatarData`/`AvatarContentType` so the frontend never
has to assemble it) — this keeps the existing pattern where `AuthResponse` already carries
everything the frontend needs to hydrate (`language`, `theme`, and now the avatar too).

## Backend components (Clean Architecture placement)

- `SmartTask.Domain/Auth/Session.cs` — the entity above.
- `SmartTask.Application/Auth/ISessionRepository.cs` — `GetByIdAsync`, `GetActiveByUserIdAsync(Guid userId)`,
  `AddAsync`, `SaveChangesAsync`. (No `Remove` — revocation is `RevokedAt = now`, not a delete, so
  a revoked session still shows in server logs/DB if ever needed for a security review.)
- `SmartTask.Persistence/Repositories/SessionRepository.cs` — implementation.
- `SmartTask.Persistence/Configurations/SessionConfiguration.cs` — FK to `Users` (cascade delete),
  index on `UserId`.
- `SmartTask.Application/Auth/AuthContracts.cs` — extend `AuthResult` with `AvatarDataUrl` (last
  positional parameter, per this project's established convention of never reordering existing
  ones); add `ChangePasswordRequest(string CurrentPassword, string NewPassword)`,
  `UpdateAvatarRequest(string AvatarBase64, string ContentType)`,
  `SessionSummary(Guid Id, string DeviceLabel, string? IpAddress, DateTimeOffset CreatedAt, DateTimeOffset LastActiveAt, bool IsCurrent)`.
- `SmartTask.Application/Auth/IAuthService.cs` / `AuthService.cs` — add
  `UpdateAvatarAsync(Guid userId, string avatarBase64, string contentType, CancellationToken)`,
  `ChangePasswordAsync(Guid userId, Guid currentSessionId, string currentPassword, string newPassword, CancellationToken)`,
  `GetSessionsAsync(Guid userId, Guid currentSessionId, CancellationToken)`,
  `RevokeSessionAsync(Guid userId, Guid currentSessionId, Guid sessionToRevokeId, CancellationToken)`
  (throws a distinct exception/returns a distinguishable result for "that's your own current
  session"), `RevokeOtherSessionsAsync(Guid userId, Guid currentSessionId, CancellationToken)`,
  `LogoutAsync(Guid sessionId, CancellationToken)`. `RegisterAsync`/`LoginAsync` change internally
  to create the `Session` row and thread its id into `JwtTokenGenerator`.
- `SmartTask.Application/Abstractions/IJwtTokenGenerator.cs` — `GenerateToken` gains a
  `Guid sessionId` parameter (the caller — `AuthService` — creates the `Session` row first with a
  known `Id`, then passes that same `Id` in so the token's `jti` matches it exactly, rather than
  the generator inventing its own `Guid.NewGuid()` for `jti` as it does today).
- `SmartTask.Api/Controllers/AuthController.cs` — the 6 new/changed endpoints above, following
  this controller's existing validation-before-service-call pattern.
- Device label parsing: a small pure function (e.g. `SmartTask.Infrastructure/Security/
  DeviceLabelParser.cs`), given a raw `User-Agent` string, returns a short human string like
  "Chrome on Windows" or "Safari on iPhone" — pattern-matches the handful of common
  browser/OS tokens (Chrome/Firefox/Safari/Edge; Windows/Mac OS/iPhone/Android/Linux); anything
  unrecognized falls back to `"Unknown device"`. This is a heuristic, not a full user-agent
  parsing library — good enough for a human glancing at their own session list, not a security
  boundary (the actual security boundary is the session id / revocation, not the label).

## Migration

One new migration, `AddAvatarAndSessions`:
- `Users`: add nullable `AvatarData` (`longblob` — MySQL's BLOB type sized for up to ~4 GB,
  though the app-level 1.5 MB cap is what actually matters) and nullable `AvatarContentType`
  (`varchar(20)`).
- `Sessions`: new table, all columns from the entity above, FK to `Users.Id` with
  `OnDelete(Cascade)`, index on `UserId`.

No backfill needed — both are purely additive/new, no existing rows need retrofitting (unlike the
earlier per-user-isolation migration, which had to backfill an existing dataset).

## Frontend changes

- `packages/api-client/src/authApi.ts`: extend `AuthResponse` with `avatarDataUrl: string | null`;
  add `updateAvatar(avatarBase64, contentType)`, `changePassword(currentPassword, newPassword)`,
  `listSessions()`, `revokeSession(id)`, `revokeOtherSessions()`, `logout()` — all thin wrappers
  over `httpClient`, matching `updateLanguage`/`updateTheme`'s existing shape exactly.
- `packages/app-core/src/state/AuthContext.tsx`: add `avatarDataUrl: string | null` to context
  state, persisted in the same `stm.auth` localStorage blob as `language`/`theme` are today; add
  `setAvatar(base64, contentType)` (calls the API, then updates local state — no need to re-fetch,
  same pattern as `setLanguage`/`setTheme`). `logout()` becomes `async`: it now calls
  `authApi.logout()` first (revoking the session server-side), wrapped in try/catch so a network
  failure during logout still clears local state and signs the user out client-side — never let a
  failed revoke call trap the user in a "logged in" UI they can't leave.
- `packages/app-core/src/lib/passwordRules.ts` (new, extracted): the `PASSWORD_RULES` array and
  `PasswordRule` type currently defined inline in `LoginPage.tsx` move here, unchanged, so the new
  change-password form can reuse the exact same 4 rules/checklist UI instead of duplicating them.
  `LoginPage.tsx` imports from here instead of defining its own copy.
- `packages/ui`: a small reusable `PasswordStrengthChecklist` component (the `<ul>` of ✓/○ rows
  currently inline in `LoginPage.tsx`), taking `password: string` and reusing `passwordRules.ts`'s
  logic — used by both `LoginPage` (register mode) and the new change-password section.
- `packages/app-core/src/pages/AccountSettings/AccountSettingsPage.tsx` — full rewrite, three
  sections styled like the mockup (card-per-section, matching this project's existing
  `sectionCardClasses` convention):
  1. **Profile** — avatar circle (shows `avatarDataUrl` if set, else the existing initials
     fallback), a "Change photo" file input (`accept="image/*"`), email (read-only, unchanged from
     today), Language + Dark Mode (unchanged from the current page).
  2. **Security** — current/new/confirm password fields with the shared strength checklist,
     "Update Password" button (disabled until valid, mirroring the Register form's
     `isRegisterValid` pattern), inline error display for wrong current password (`401`) or
     policy violations (`400`).
  3. **Active Sessions** — list from `GET /sessions`; each row shows device label, IP, "Active
     now" (if `lastActiveAt` within the last 2 minutes) or a relative time otherwise; the current
     session shows a "This device" badge instead of a Revoke button (matches mockup); every other
     row gets a "Revoke" link; a "Sign out of all other sessions" link at the bottom calls
     `revoke-others` and refetches the list.
- **Avatar client-side resize before upload**: before calling `setAvatar`, the selected file is
  drawn onto an offscreen `<canvas>` capped at 256×256 (preserving aspect ratio, cropped to
  square) and re-exported as JPEG at quality 0.85. This keeps typical uploads well under the
  1.5 MB backend cap regardless of the original photo's size, and keeps the `stm.auth` localStorage
  blob (which now carries the avatar's data URI) small. A file that's still somehow over the cap
  after resizing (extremely rare) is rejected client-side with a clear error before the request is
  even sent.

## Error handling

Following this controller's existing pattern (inline validation, typed exceptions from the
service layer mapped to specific HTTP statuses in the controller):

- Wrong current password on change-password → `401` (not `400` — distinguishes "you got a fact
  about your own account wrong" from "your input was malformed", consistent with `Login`'s
  existing `401` for wrong credentials).
- New password fails the policy regex → `400`, same message format `Register` already uses.
- Avatar wrong content-type or over size cap → `400`.
- Revoking your own current session via `DELETE /sessions/{id}` → `400` with a clear message
  ("Sign out to end your own session").
- Revoking a session that doesn't exist or belongs to someone else → `404` (query-filter-backed,
  same as every other entity).

## Testing plan

No test project exists in this repo (confirmed earlier this project) — verification is
`dotnet build -c Release` (0 warnings/0 errors) plus real `curl` checks against a running
instance, matching this project's established practice:

- Register a fresh account, confirm `avatarDataUrl` is `null` until an avatar is set.
- `PATCH /avatar` with a valid small JPEG (base64) → `204`; `GET /me`-equivalent (or a fresh
  login) shows the new `avatarDataUrl`.
- `PATCH /avatar` with an oversized payload or a disallowed content type → `400`.
- `PATCH /password` with the wrong current password → `401`; with a policy-violating new password
  → `400`; with valid input → `204`, and the OLD token from a second concurrent login session is
  confirmed revoked (its next authenticated request returns `401`).
- `GET /sessions` after 2 logins from "different devices" (different `User-Agent` headers via
  curl) shows both, one marked `isCurrent`.
- `DELETE /sessions/{id}` on the current session → `400`; on another session → `204`, and that
  session's token immediately gets `401` on its next request.
- `POST /sessions/revoke-others` revokes all but the caller's own session.
- `POST /logout` revokes the calling session; that same token gets `401` immediately after.
- Full frontend build (`npm run build:tauri`, `npm run build:web`) succeeds.
