# Per-User Data Isolation — Design

## Problem

`TasksController`'s own doc comment says it plainly: *"the Tasks table
isn't partitioned per-user ... every authenticated caller sees the same
task list — correct for a single-user personal instance, not a
multi-tenant assumption."* That assumption was true when this app had
exactly one user. It is no longer true — the app now supports creating
multiple accounts (Phase 22's JWT auth), and a new account currently
sees every other account's Tasks, Projects, Goals, Habits, and
Notifications. None of those five tables has a `UserId` column at all.

## Goal

Every account's Tasks/Projects/Goals/Habits/Notifications belong only
to that account. A brand-new account starts completely empty. Existing
accounts keep the data they already have.

## Non-goals

- No sharing/collaboration between accounts (no "invite a teammate to
  this project") — out of scope, not requested.
- No change to `Users` table itself beyond what's needed to identify
  the "first" user for the data migration.
- No change to the JWT/auth flow — `ClaimTypes.NameIdentifier` already
  carries the caller's `UserId` on every authenticated request
  (`AuthController` already reads it this way for the language/theme
  endpoints).

## Approach: EF Core global query filter + auto-assign on insert

Two changes reused everywhere via `AppDbContext`, instead of touching
every repository/service/controller method by hand:

1. **A global query filter** on `TaskItem`, `Project`, `Goal`, `Habit`,
   `Notification`: every EF Core query against these tables
   automatically adds `WHERE UserId = <current user>` — including
   `GetByIdAsync`, `GetAllAsync`, `GetChangedSinceAsync`, everything.
   Nobody has to remember to filter; it isn't possible to forget.
   A useful side effect: `GetByIdAsync(someoneElseId)` now returns
   `null` automatically, and every controller already returns 404 on
   `null` — ownership checking on read/update/delete falls out for
   free, no controller changes needed.

2. **Auto-assign `UserId` on insert**, via an `AppDbContext.SaveChangesAsync`
   override: any newly-added entity that owns a `UserId` gets it set
   to the current user automatically. No `AddAsync` call site
   (Task/Project/Goal/Habit/Notification creation, including the sync
   push path) needs to change.

Both read off a small scoped service, `ICurrentUserContext`
(`Guid? UserId { get; set; }`), registered as Scoped:

- **In an HTTP request**: a small piece of middleware, added right
  after `app.UseAuthentication()`, reads `ClaimTypes.NameIdentifier`
  off `HttpContext.User` (same pattern `AuthController` already uses)
  and sets `ICurrentUserContext.UserId` once per request, before any
  controller runs.
- **In a background service** (`DailySmartRecalcHostedService`,
  `NotificationGenerationHostedService` — both currently operate over
  *all* rows in one pass with no per-user concept): loop over every
  row in `Users`, open one new DI scope per user, set that scope's
  `ICurrentUserContext.UserId` to that user's id before resolving
  `ISmartEngineService`/`INotificationService` in it. The existing
  per-invocation service methods (`RecalculateAllAsync`,
  `GenerateAsync`) don't change — the query filter scopes them
  automatically because each scope gets its own `AppDbContext`.

If `ICurrentUserContext.UserId` is ever left unset (a bug, or a code
path nobody anticipated), the filter's `Guid?` comparison against a
non-nullable column fails closed — it matches nothing, not everything.
Wrong-but-safe, never wrong-and-leaky.

### Why this over the alternative

The alternative — adding a `Guid userId` parameter to every repository
and service method (`GetAllAsync(Guid userId, ...)`, `GetByIdAsync(Guid
id, Guid userId, ...)`, etc.) — touches roughly 30+ method signatures
across 5 repository interfaces, 5 repository implementations, 5
services, and 5 controllers, and is one missed parameter away from
silently leaking data again (exactly today's bug, just moved). The
query-filter approach touches `AppDbContext` once, 5 entity
configurations, and the two hosted services — a fraction of the
surface, and structurally unable to "forget" the filter.

## Data model changes

Add `public Guid UserId { get; set; }` to:
- `TaskItem` (`SmartTask.Domain/Tasks/TaskItem.cs`)
- `Project` (`SmartTask.Domain/Projects/Project.cs`)
- `Goal` (`SmartTask.Domain/Goals/Goal.cs`)
- `Habit` (`SmartTask.Domain/Habits/Habit.cs`)
- `Notification` (`SmartTask.Domain/Notifications/Notification.cs`)

Each gets a `HasOne(...).WithMany().HasForeignKey(x => x.UserId)` in
its `EntityTypeConfiguration`, plus an index on `UserId` (every query
now filters on it). No navigation property back from `User` is needed
— nothing currently needs "give me a user's tasks" outside of the
already-scoped-by-filter normal queries.

## Migration and existing-data backfill

Standard two-step, since these are new required columns on tables that
already hold rows:

1. Add `UserId` as **nullable** in the migration.
2. In the migration's `Up()`, run raw SQL that sets `UserId` to the
   `Id` of the user with the earliest `CreatedAt` in the `Users` table,
   for every existing row in the 5 tables where `UserId IS NULL`. This
   is the account you've already been using — it keeps all your
   existing data.
3. Alter the column to **non-nullable** in the same migration, once
   backfilled.

If `Users` is ever empty at migration time (a fresh database, not this
project's case), the backfill step is a no-op — there's nothing to
backfill.

## Testing plan

- New EF Core migration applies cleanly against the real Railway MySQL
  database (verified with a real `dotnet ef database update` or the
  app's existing retry-migration-on-startup path), and the backfill
  correctly assigns all current rows to the pre-existing account.
- After migration: log in as the existing account → all previously
  created Tasks/Projects/Goals/Habits/Notifications are still there.
- Register a brand-new account → Tasks/Projects/Goals/Habits/
  Notifications lists are all empty.
- Create a Task on the new account → it does not appear when logged
  into the original account, and vice versa.
- `GET /api/tasks/{id}` for a task owned by a different account →
  `404`, not the task.
- The two hosted services (daily Smart Engine recalc, notification
  generation) still process every account's data, not just one —
  verified by seeding two accounts with overdue tasks and confirming
  both get their own notifications after a manual trigger.
- Full backend build (`dotnet build -c Release`) — 0 warnings, 0
  errors, matching this project's existing standard.
