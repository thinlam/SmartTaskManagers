# Per-User Data Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every account's Tasks/Projects/Goals/Habits/Notifications belong only to that account — a new account starts empty, existing accounts keep what they already have.

**Architecture:** Add a `UserId` column to the 5 affected tables. An EF Core global query filter on `AppDbContext`, driven by a small scoped `ICurrentUserContext` service, transparently scopes every query to the logged-in user; a `SaveChangesAsync` override auto-assigns `UserId` on insert. A request-scoped middleware in `Program.cs` sets the current user from the JWT claim already present on every authenticated request; the two hosted background services set it manually once per user, per loop iteration, since they run outside any HTTP request.

**Tech Stack:** ASP.NET Core 10, EF Core (Microting.EntityFrameworkCore.MySql provider), MySQL 8.0 (Railway).

**Spec:** `docs/superpowers/specs/2026-09-23-per-user-data-isolation-design.md`

## Global Constraints

- No test project exists in this repo (`find . -iname "*.Tests.csproj"` returns nothing) — verification is `dotnet build -c Release` (must stay 0 warnings / 0 errors, this project's existing bar) plus real `curl` checks against a running instance, matching how every other backend change this session was verified. Do not introduce a test project as part of this plan — out of scope.
- Follow the existing Clean Architecture layering exactly: interfaces in `SmartTask.Application` (Domain has zero dependencies — never add one), implementations in `SmartTask.Infrastructure`/`SmartTask.Persistence`, composition in `SmartTask.Api/Program.cs`.
- Match existing code style precisely: file-scoped `namespace X;`, primary constructors (`public sealed class Foo(IBar bar) : IFoo`), XML-doc-style `///` comments only where they explain *why*, not *what*.
- Comments in new/touched files are English-only (the codebase's established convention — the one exception, Program.cs's recent Vietnamese comments, was flagged in this session as inconsistent with the rest of the code; do not add more Vietnamese comments).
- Every EF Core migration must be generated with `dotnet ef migrations add <Name>` run from `backend/SmartTask.Api` (the startup project) so `AppDbContextModelSnapshot.cs` updates correctly — never hand-write the snapshot.

## Review Focus

- **Existing account, existing data, first login after migration** — must see exactly the data it had before, nothing added, nothing missing. Task 5's backfill step is the one place this can silently go wrong (wrong "first user" selection, or a row left with `NULL` before the non-nullable `ALTER`).
- **Brand-new account's very first `GET /api/tasks` (and Projects/Goals/Habits/Notifications)** — must return an empty array, not an error and not another account's rows. Task 3's query filter is what this depends on; Task 8 is where this gets an explicit curl check.
- **A request whose JWT is malformed or missing the `NameIdentifier` claim** — must not crash the app or silently fall through to "see everything." Task 6's middleware must leave `ICurrentUserContext.UserId` as `null` in that case, and the query filter's `null`-comparison behavior (matches nothing) is what keeps that safe — Task 3 must get this comparison right, not `!= null` accidentally inverted.
- **The two hosted background services after this change, with 2+ accounts that each have overdue tasks** — both accounts must get their own Smart Engine recalculation and their own notifications, not just the first account processed or only one shared run. Task 7 owns this; its test is explicit in that task.
- **A `POST /api/tasks` (or Projects/Goals/Habits) call** — the created row must carry the *caller's* `UserId`, not a `Guid.Empty`/default value and not another account's id lingering in `ICurrentUserContext` from connection pooling. Task 3's `SaveChangesAsync` override is what this depends on; Task 8's end-to-end check confirms it.

---

## File Structure

| File | Responsibility |
|---|---|
| `backend/SmartTask.Application/Abstractions/ICurrentUserContext.cs` | New. Interface: `Guid? UserId { get; set; }` |
| `backend/SmartTask.Infrastructure/Security/CurrentUserContext.cs` | New. Plain mutable implementation, no dependencies. |
| `backend/SmartTask.Infrastructure/DependencyInjection.cs` | Modify. Register `ICurrentUserContext` as Scoped. |
| `backend/SmartTask.Domain/Tasks/TaskItem.cs` | Modify. Add `UserId`. |
| `backend/SmartTask.Domain/Projects/Project.cs` | Modify. Add `UserId`. |
| `backend/SmartTask.Domain/Goals/Goal.cs` | Modify. Add `UserId`. |
| `backend/SmartTask.Domain/Habits/Habit.cs` | Modify. Add `UserId`. |
| `backend/SmartTask.Domain/Notifications/Notification.cs` | Modify. Add `UserId`. |
| `backend/SmartTask.Persistence/Configurations/TaskItemConfiguration.cs` | Modify. FK + index on `UserId`. |
| `backend/SmartTask.Persistence/Configurations/ProjectConfiguration.cs` | Modify. FK + index on `UserId`. |
| `backend/SmartTask.Persistence/Configurations/GoalConfiguration.cs` | Modify. FK + index on `UserId`. |
| `backend/SmartTask.Persistence/Configurations/HabitConfiguration.cs` | Modify. FK + index on `UserId`. |
| `backend/SmartTask.Persistence/Configurations/NotificationConfiguration.cs` | Modify. FK + index on `UserId`. |
| `backend/SmartTask.Persistence/AppDbContext.cs` | Modify. Inject `ICurrentUserContext`, add 5 query filters, override `SaveChangesAsync`. |
| `backend/SmartTask.Persistence/Migrations/<timestamp>_AddUserIdOwnership.cs` | New (generated + hand-edited for the backfill SQL). |
| `backend/SmartTask.Api/Program.cs` | Modify. Add current-user middleware after `UseAuthorization()`. |
| `backend/SmartTask.Api/BackgroundServices/DailySmartRecalcHostedService.cs` | Modify. Loop per user. |
| `backend/SmartTask.Api/BackgroundServices/NotificationGenerationHostedService.cs` | Modify. Loop per user. |
| `docs/roadmap/ROADMAP.md` | Modify. Record what shipped and what was actually verified. |

---

### Task 1: `ICurrentUserContext` service

**Files:**
- Create: `backend/SmartTask.Application/Abstractions/ICurrentUserContext.cs`
- Create: `backend/SmartTask.Infrastructure/Security/CurrentUserContext.cs`
- Modify: `backend/SmartTask.Infrastructure/DependencyInjection.cs`

**Interfaces:**
- Produces: `ICurrentUserContext` with `Guid? UserId { get; set; }` — every later task (query filter, `SaveChangesAsync` override, Program.cs middleware, both hosted services) reads or writes this exact property.

- [ ] **Step 1: Create the interface**

```csharp
namespace SmartTask.Application.Abstractions;

/// <summary>
/// The authenticated caller's id for the current DI scope — one HTTP
/// request, or one manually-created scope inside a background service.
/// Application depends on this; Infrastructure implements it.
/// Null means "no user resolved yet" (or a background service scope
/// that hasn't been assigned one) — AppDbContext's query filter treats
/// null as "match nothing," never "match everything," so leaving this
/// unset fails closed.
/// </summary>
public interface ICurrentUserContext
{
    Guid? UserId { get; set; }
}
```

- [ ] **Step 2: Create the implementation**

```csharp
using SmartTask.Application.Abstractions;

namespace SmartTask.Infrastructure.Security;

/// <summary>
/// Plain mutable holder, no dependencies — Program.cs's middleware sets
/// it once per HTTP request from the JWT claim; the two hosted services
/// set it manually once per user per loop iteration inside their own
/// per-user DI scope. Registered Scoped so each request/scope gets its
/// own instance (see DependencyInjection.cs).
/// </summary>
public sealed class CurrentUserContext : ICurrentUserContext
{
    public Guid? UserId { get; set; }
}
```

- [ ] **Step 3: Register it**

In `backend/SmartTask.Infrastructure/DependencyInjection.cs`, add inside `AddInfrastructure`, alongside the existing registrations:

```csharp
        services.AddScoped<ICurrentUserContext, CurrentUserContext>();
```

Full method body after the change:

```csharp
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();
        services.AddScoped<ICurrentUserContext, CurrentUserContext>();

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.AddSingleton<IPasswordHasher, PasswordHasherAdapter>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();

        return services;
    }
```

Add `using SmartTask.Application.Abstractions;` and `using SmartTask.Infrastructure.Security;` at the top if not already present (the file already has the first; add the second).

- [ ] **Step 4: Build to verify**

Run: `cd backend && dotnet build -c Release`
Expected: `Build succeeded. 0 Warning(s) 0 Error(s)`

- [ ] **Step 5: Commit**

```bash
git add backend/SmartTask.Application/Abstractions/ICurrentUserContext.cs backend/SmartTask.Infrastructure/Security/CurrentUserContext.cs backend/SmartTask.Infrastructure/DependencyInjection.cs
git commit -m "feat(backend): add ICurrentUserContext scoped service"
```

---

### Task 2: Add `UserId` to the 5 domain entities

**Files:**
- Modify: `backend/SmartTask.Domain/Tasks/TaskItem.cs`
- Modify: `backend/SmartTask.Domain/Projects/Project.cs`
- Modify: `backend/SmartTask.Domain/Goals/Goal.cs`
- Modify: `backend/SmartTask.Domain/Habits/Habit.cs`
- Modify: `backend/SmartTask.Domain/Notifications/Notification.cs`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: a `public Guid UserId { get; set; }` property on all 5 types — Task 3 (query filter + `SaveChangesAsync`) and Task 4 (FK configuration) both reference this exact property name and type on all 5.

- [ ] **Step 1: `TaskItem.cs`** — add the property right after the class declaration, before `Name`:

```csharp
public sealed class TaskItem : SyncableEntity
{
    /// <summary>The account that owns this task. Set automatically by AppDbContext.SaveChangesAsync on insert — never set this directly.</summary>
    public Guid UserId { get; set; }

    public required string Name { get; set; }
```

- [ ] **Step 2: `Project.cs`** — same pattern:

```csharp
public sealed class Project : SyncableEntity
{
    /// <summary>The account that owns this project. Set automatically by AppDbContext.SaveChangesAsync on insert — never set this directly.</summary>
    public Guid UserId { get; set; }

    public required string Name { get; set; }
```

- [ ] **Step 3: `Goal.cs`** — same pattern:

```csharp
public sealed class Goal : SyncableEntity
{
    /// <summary>The account that owns this goal. Set automatically by AppDbContext.SaveChangesAsync on insert — never set this directly.</summary>
    public Guid UserId { get; set; }

    public required string Name { get; set; }
```

- [ ] **Step 4: `Habit.cs`** — same pattern:

```csharp
public sealed class Habit : SyncableEntity
{
    /// <summary>The account that owns this habit. Set automatically by AppDbContext.SaveChangesAsync on insert — never set this directly.</summary>
    public Guid UserId { get; set; }

    public required string Name { get; set; }
```

- [ ] **Step 5: `Notification.cs`** — same pattern (this one extends `Entity`, not `SyncableEntity` — leave that as-is):

```csharp
public sealed class Notification : Entity
{
    /// <summary>The account this notification is for. Set automatically by AppDbContext.SaveChangesAsync on insert — never set this directly.</summary>
    public Guid UserId { get; set; }

    public required NotificationType Type { get; set; }
```

- [ ] **Step 6: Build to verify**

Run: `cd backend && dotnet build -c Release`
Expected: `Build succeeded. 0 Warning(s) 0 Error(s)` — this step only adds a plain property, nothing consumes it yet, so it must compile cleanly on its own.

- [ ] **Step 7: Commit**

```bash
git add backend/SmartTask.Domain/Tasks/TaskItem.cs backend/SmartTask.Domain/Projects/Project.cs backend/SmartTask.Domain/Goals/Goal.cs backend/SmartTask.Domain/Habits/Habit.cs backend/SmartTask.Domain/Notifications/Notification.cs
git commit -m "feat(backend): add UserId to Task/Project/Goal/Habit/Notification"
```

---

### Task 3: Query filter + auto-assign in `AppDbContext`

**Files:**
- Modify: `backend/SmartTask.Persistence/AppDbContext.cs`

**Interfaces:**
- Consumes: `ICurrentUserContext` (Task 1, `SmartTask.Application.Abstractions`), `UserId` on all 5 entities (Task 2).
- Produces: every query against `Tasks`/`Projects`/`Goals`/`Habits`/`Notifications` is now filtered to `ICurrentUserContext.UserId`; every `SaveChangesAsync` call auto-fills `UserId` on newly-added rows of those 5 types. No repository or service code needs to change to pick this up.

- [ ] **Step 1: Rewrite `AppDbContext.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using SmartTask.Application.Abstractions;
using SmartTask.Domain.Common;
using SmartTask.Domain.Goals;
using SmartTask.Domain.Habits;
using SmartTask.Domain.Notifications;
using SmartTask.Domain.Projects;
using SmartTask.Domain.Tasks;
using SmartTask.Domain.Users;

namespace SmartTask.Persistence;

/// <summary>
/// Schema — DbSets and their EntityTypeConfiguration classes (see
/// Configurations/) match TASK_HEADERS/PROJECT_HEADERS/GOAL_HEADERS/
/// HABIT_HEADERS in apps/google-sheets/src/00_Constants.gs (Phase 21),
/// plus the sync columns (Id UUID/SyncStatus/LastSyncedAt/Version) from
/// SmartTask.Domain.Common.SyncableEntity. `Users` (Phase 22) has no
/// Sheets counterpart — see the type's own doc comment.
///
/// Per-user data isolation: Tasks/Projects/Goals/Habits/Notifications
/// each carry a UserId. OnModelCreating adds a global query filter on
/// all 5 so every query (list, get-by-id, sync's changed-since, etc.)
/// is automatically scoped to the caller — no repository or service
/// method needs a userId parameter. SaveChangesAsync below auto-fills
/// UserId on insert, so no AddAsync call site needs to change either.
/// currentUserContext.UserId is set once per HTTP request by
/// Program.cs's middleware, or manually per iteration by the two
/// hosted background services (see their own doc comments) since they
/// run outside any request.
/// </summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUserContext currentUserContext)
    : DbContext(options)
{
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<Habit> Habits => Set<Habit>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // currentUserContext.UserId is a Guid? that starts null and is
        // only ever set to a real user's id — comparing a non-nullable
        // UserId column against a null parameter matches zero rows, so
        // an unset current user fails closed (empty result), never open.
        modelBuilder.Entity<TaskItem>().HasQueryFilter(t => t.UserId == currentUserContext.UserId);
        modelBuilder.Entity<Project>().HasQueryFilter(p => p.UserId == currentUserContext.UserId);
        modelBuilder.Entity<Goal>().HasQueryFilter(g => g.UserId == currentUserContext.UserId);
        modelBuilder.Entity<Habit>().HasQueryFilter(h => h.UserId == currentUserContext.UserId);
        modelBuilder.Entity<Notification>().HasQueryFilter(n => n.UserId == currentUserContext.UserId);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var currentUserId = currentUserContext.UserId;
        if (currentUserId is not null)
        {
            foreach (var entry in ChangeTracker.Entries().Where(e => e.State == EntityState.Added))
            {
                switch (entry.Entity)
                {
                    case TaskItem task:
                        task.UserId = currentUserId.Value;
                        break;
                    case Project project:
                        project.UserId = currentUserId.Value;
                        break;
                    case Goal goal:
                        goal.UserId = currentUserId.Value;
                        break;
                    case Habit habit:
                        habit.UserId = currentUserId.Value;
                        break;
                    case Notification notification:
                        notification.UserId = currentUserId.Value;
                        break;
                }
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}
```

- [ ] **Step 2: Build to verify**

Run: `cd backend && dotnet build -c Release`
Expected: build fails with FK-related errors from the 5 `Configurations/*.cs` files not existing yet — actually no: since `UserId` is a plain `Guid` with no FK configured yet, this should build cleanly (EF Core doesn't require a configured FK to compile; it just won't have referential integrity in the DB until Task 4). Confirm: `Build succeeded. 0 Warning(s) 0 Error(s)`. If it doesn't, stop and re-read this step — do not proceed to Task 4 with a broken build.

- [ ] **Step 3: Commit**

```bash
git add backend/SmartTask.Persistence/AppDbContext.cs
git commit -m "feat(backend): scope Tasks/Projects/Goals/Habits/Notifications to the current user"
```

---

### Task 4: FK + index on `UserId` in the 5 entity configurations

**Files:**
- Modify: `backend/SmartTask.Persistence/Configurations/TaskItemConfiguration.cs`
- Modify: `backend/SmartTask.Persistence/Configurations/ProjectConfiguration.cs`
- Modify: `backend/SmartTask.Persistence/Configurations/GoalConfiguration.cs`
- Modify: `backend/SmartTask.Persistence/Configurations/HabitConfiguration.cs`
- Modify: `backend/SmartTask.Persistence/Configurations/NotificationConfiguration.cs`

**Interfaces:**
- Consumes: `UserId` (Task 2) on all 5 entities.
- Produces: a `UserId` foreign key to `Users` (cascade delete — deleting an account deletes its data) plus an index, on all 5 tables, for Task 5's migration to generate DDL from.

- [ ] **Step 1: `TaskItemConfiguration.cs`** — add after the existing `DependencyTask` FK block, before `builder.HasIndex(t => t.Status);`:

```csharp
        builder
            .HasOne<SmartTask.Domain.Users.User>()
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(t => t.UserId);
```

- [ ] **Step 2: `ProjectConfiguration.cs`** — add before the existing `builder.HasIndex(p => p.ExternalId).IsUnique();`:

```csharp
        builder
            .HasOne<SmartTask.Domain.Users.User>()
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(p => p.UserId);
```

- [ ] **Step 3: `GoalConfiguration.cs`** — add before the existing `builder.HasIndex(g => g.ExternalId).IsUnique();`:

```csharp
        builder
            .HasOne<SmartTask.Domain.Users.User>()
            .WithMany()
            .HasForeignKey(g => g.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(g => g.UserId);
```

- [ ] **Step 4: `HabitConfiguration.cs`** — add before the existing `builder.HasIndex(h => h.ExternalId).IsUnique();`:

```csharp
        builder
            .HasOne<SmartTask.Domain.Users.User>()
            .WithMany()
            .HasForeignKey(h => h.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(h => h.UserId);
```

- [ ] **Step 5: `NotificationConfiguration.cs`** — add before the existing `builder.HasIndex(n => n.IsRead);`:

```csharp
        builder
            .HasOne<SmartTask.Domain.Users.User>()
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(n => n.UserId);
```

(Using the fully-qualified `SmartTask.Domain.Users.User` inline, rather than a `using` alias, avoids a naming collision with each file's own entity type in a couple of these — e.g. `Habit`/`HabitFrequencyType` already fills the local `using SmartTask.Domain.Habits;`. Keep it consistent across all 5 for readability.)

- [ ] **Step 6: Build to verify**

Run: `cd backend && dotnet build -c Release`
Expected: `Build succeeded. 0 Warning(s) 0 Error(s)`

- [ ] **Step 7: Commit**

```bash
git add backend/SmartTask.Persistence/Configurations/TaskItemConfiguration.cs backend/SmartTask.Persistence/Configurations/ProjectConfiguration.cs backend/SmartTask.Persistence/Configurations/GoalConfiguration.cs backend/SmartTask.Persistence/Configurations/HabitConfiguration.cs backend/SmartTask.Persistence/Configurations/NotificationConfiguration.cs
git commit -m "feat(backend): add UserId foreign key + index to the 5 owned tables"
```

---

### Task 5: Migration — add `UserId`, backfill, enforce not-null

**Files:**
- Create: `backend/SmartTask.Persistence/Migrations/<timestamp>_AddUserIdOwnership.cs` (+ `.Designer.cs`, generated)
- Modify: `backend/SmartTask.Persistence/Migrations/AppDbContextModelSnapshot.cs` (generated)

**Interfaces:**
- Consumes: the model shape produced by Tasks 2 and 4.
- Produces: the actual `UserId` column + FK + index in the database, and the existing rows correctly attributed to the earliest-created account. Task 8's end-to-end verification depends on this having actually run against the real Railway database.

- [ ] **Step 1: Generate the migration**

Run from `backend/SmartTask.Api` (the startup project — matches how `AddUserLanguage`/`AddUserTheme` were generated earlier this session):

```bash
cd backend/SmartTask.Api
dotnet ef migrations add AddUserIdOwnership --project ../SmartTask.Persistence --startup-project .
```

Expected: two new files under `SmartTask.Persistence/Migrations/` (`<timestamp>_AddUserIdOwnership.cs` and its `.Designer.cs`), and `AppDbContextModelSnapshot.cs` updated. The generated `Up()` will add `UserId` as **non-nullable** by default with no default value — this will fail against a database with existing rows, which is exactly why Step 2 hand-edits it.

- [ ] **Step 2: Hand-edit the generated `Up()` method**

Open the new `<timestamp>_AddUserIdOwnership.cs`. It will contain 5 `migrationBuilder.AddColumn<Guid>(name: "UserId", table: "...", nullable: false, defaultValue: ...)` calls (one per table) followed by `AddForeignKey`/`CreateIndex` calls. Change each `AddColumn` call's `nullable` argument from `false` to `true` and remove any `defaultValue` argument EF Core added, so all 5 start nullable. Then, immediately after all 5 `AddColumn` calls and before the `AddForeignKey`/`CreateIndex` calls, insert the backfill:

```csharp
            migrationBuilder.Sql(
                """
                UPDATE Tasks SET UserId = (SELECT Id FROM Users ORDER BY CreatedAt LIMIT 1) WHERE UserId IS NULL;
                UPDATE Projects SET UserId = (SELECT Id FROM Users ORDER BY CreatedAt LIMIT 1) WHERE UserId IS NULL;
                UPDATE Goals SET UserId = (SELECT Id FROM Users ORDER BY CreatedAt LIMIT 1) WHERE UserId IS NULL;
                UPDATE Habits SET UserId = (SELECT Id FROM Users ORDER BY CreatedAt LIMIT 1) WHERE UserId IS NULL;
                UPDATE Notifications SET UserId = (SELECT Id FROM Users ORDER BY CreatedAt LIMIT 1) WHERE UserId IS NULL;
                """
            );

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "Tasks",
                type: "char(36)",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "Projects",
                type: "char(36)",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "Goals",
                type: "char(36)",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "Habits",
                type: "char(36)",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "Notifications",
                type: "char(36)",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
```

If the actual column `type` string EF Core generated for `UserId` differs from `"char(36)"` (check the `AddColumn` calls it generated in Step 1 — `Id` on these same tables is the reference for what a `Guid` column type looks like on this provider), use that exact type string here instead, so the `AlterColumn` matches the already-created column type. This backfill runs once, before the `NOT NULL` constraint is added, so an empty `Users` table (fresh database) leaves all 5 `UPDATE`s as no-ops and the subsequent `AlterColumn` calls would then fail on non-existent rows — that's fine, because a fresh database also has zero rows in `Tasks`/`Projects`/`Goals`/`Habits`/`Notifications` to fail on.

- [ ] **Step 3: Build to verify the migration compiles**

Run: `cd backend && dotnet build -c Release`
Expected: `Build succeeded. 0 Warning(s) 0 Error(s)`

- [ ] **Step 4: Apply the migration against the real Railway database and verify the backfill**

This project's `Program.cs` already runs `dbContext.Database.MigrateAsync()` on startup (with retry) — the migration applies automatically the next time the API deploys. To verify without waiting on a deploy, run it directly against Railway's MySQL now:

```bash
cd backend/SmartTask.Api
dotnet ef database update --project ../SmartTask.Persistence --startup-project . --connection "<the real Railway ConnectionStrings:DefaultConnection value>"
```

(Get the real connection string from Railway's dashboard → the API service → Variables, or from whatever secret store this project keeps it in locally — do not commit it anywhere.)

Then verify the backfill actually worked:

```bash
curl -sS -m 15 https://smarttaskmanagers-production.up.railway.app/health/db
```

Expected: `{"status":"Healthy"}`. If the app was already running against the old schema, restart it (Railway redeploys on the next push, or trigger a manual restart from the dashboard) so it picks up the new `UserId`-aware `AppDbContext`.

- [ ] **Step 5: Commit**

```bash
git add backend/SmartTask.Persistence/Migrations/
git commit -m "feat(backend): migrate UserId onto Tasks/Projects/Goals/Habits/Notifications, backfill existing rows to the earliest account"
```

---

### Task 6: Set the current user per HTTP request

**Files:**
- Modify: `backend/SmartTask.Api/Program.cs`

**Interfaces:**
- Consumes: `ICurrentUserContext` (Task 1).
- Produces: `ICurrentUserContext.UserId` is set to the authenticated caller's id before any controller action runs, for every authenticated request. Unauthenticated/malformed-token requests leave it `null` (query filter then matches nothing — see Review Focus).

- [ ] **Step 1: Add the middleware**

In `backend/SmartTask.Api/Program.cs`, immediately after `app.UseAuthorization();` (currently line 412), add:

```csharp

// ============================================================
// CURRENT USER CONTEXT
// ============================================================
//
// Must run after UseAuthentication/UseAuthorization — that's what
// populates HttpContext.User's claims. AppDbContext's query filter
// (see SmartTask.Persistence/AppDbContext.cs) reads this per request
// to scope every Task/Project/Goal/Habit/Notification query to the
// caller. Left null (never set) for unauthenticated requests — the
// filter then matches nothing, not everything.
//

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

- [ ] **Step 2: Add the two missing `using` directives**

At the top of `Program.cs`, add (matching the existing alphabetical grouping of `using` statements):

```csharp
using System.Security.Claims;
using SmartTask.Application.Abstractions;
```

- [ ] **Step 3: Build to verify**

Run: `cd backend && dotnet build -c Release`
Expected: `Build succeeded. 0 Warning(s) 0 Error(s)`

- [ ] **Step 4: Commit**

```bash
git add backend/SmartTask.Api/Program.cs
git commit -m "feat(backend): set the current user per request for AppDbContext's query filter"
```

---

### Task 7: Per-user loop in the two hosted background services

**Files:**
- Modify: `backend/SmartTask.Api/BackgroundServices/DailySmartRecalcHostedService.cs`
- Modify: `backend/SmartTask.Api/BackgroundServices/NotificationGenerationHostedService.cs`

**Interfaces:**
- Consumes: `ICurrentUserContext` (Task 1), `AppDbContext.Users` (existing `DbSet<User>`), `ISmartEngineService.RecalculateAllAsync`/`INotificationService.GenerateAsync` (existing, unchanged signatures).
- Produces: both services now process every account's data once per run, not one shared/unscoped pass.

- [ ] **Step 1: Rewrite `DailySmartRecalcHostedService.cs`'s scoped block**

Replace the existing body of the inner `try` block (the one that currently does `using var scope = scopeFactory.CreateScope(); var smartEngineService = ...; var count = await smartEngineService.RecalculateAllAsync(...)`) with:

```csharp
            try
            {
                using var userListScope = scopeFactory.CreateScope();
                var dbContext = userListScope.ServiceProvider.GetRequiredService<AppDbContext>();
                var userIds = await dbContext.Users.Select(u => u.Id).ToListAsync(stoppingToken);

                var totalCount = 0;
                foreach (var userId in userIds)
                {
                    using var userScope = scopeFactory.CreateScope();
                    userScope.ServiceProvider.GetRequiredService<ICurrentUserContext>().UserId = userId;

                    var smartEngineService = userScope.ServiceProvider.GetRequiredService<ISmartEngineService>();
                    totalCount += await smartEngineService.RecalculateAllAsync(stoppingToken);
                }

                logger.LogInformation("Daily Smart Engine recalculation updated {Count} task(s) across {UserCount} account(s).", totalCount, userIds.Count);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // A single failed run (e.g. a transient DB hiccup) must
                // not crash the hosted service loop — log it and try
                // again at the next scheduled time instead.
                logger.LogError(ex, "Daily Smart Engine recalculation failed.");
            }
```

Add `using Microsoft.EntityFrameworkCore;`, `using SmartTask.Application.Abstractions;`, and `using SmartTask.Persistence;` at the top of the file.

- [ ] **Step 2: Rewrite `NotificationGenerationHostedService.cs`'s scoped block**

Replace the existing body of the `try` block (the one that currently does `using var scope = scopeFactory.CreateScope(); var notificationService = ...; var count = await notificationService.GenerateAsync(...)`) with:

```csharp
            try
            {
                using var userListScope = scopeFactory.CreateScope();
                var dbContext = userListScope.ServiceProvider.GetRequiredService<AppDbContext>();
                var userIds = await dbContext.Users.Select(u => u.Id).ToListAsync(stoppingToken);

                var totalCount = 0;
                foreach (var userId in userIds)
                {
                    using var userScope = scopeFactory.CreateScope();
                    userScope.ServiceProvider.GetRequiredService<ICurrentUserContext>().UserId = userId;

                    var notificationService = userScope.ServiceProvider.GetRequiredService<INotificationService>();
                    totalCount += await notificationService.GenerateAsync(stoppingToken);
                }

                if (totalCount > 0)
                {
                    logger.LogInformation("Notification generation created {Count} notification(s) across {UserCount} account(s).", totalCount, userIds.Count);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // A single failed run must not crash the loop — log it
                // and try again at the next interval instead.
                logger.LogError(ex, "Notification generation failed.");
            }
```

Add `using Microsoft.EntityFrameworkCore;`, `using SmartTask.Application.Abstractions;`, and `using SmartTask.Persistence;` at the top of the file.

- [ ] **Step 3: Build to verify**

Run: `cd backend && dotnet build -c Release`
Expected: `Build succeeded. 0 Warning(s) 0 Error(s)`

- [ ] **Step 4: Manual verification with 2 accounts**

This is the Review Focus item for this task — do not skip it. Against a running instance (local `dotnet run`, or the deployed Railway instance):

1. Register two accounts (`curl -X POST .../api/auth/register` twice with different emails), grab both tokens.
2. Create an overdue task on each account (`curl -X POST .../api/tasks` with each account's Bearer token, `dueDate` in the past, matching whatever `CreateTaskRequest` shape `TasksController.Create` expects).
3. Trigger notification generation manually if an endpoint exists for it (check `NotificationsController` for a `POST .../generate` action — `NotificationService.GenerateAsync`'s doc comment in Task 7 above references one), otherwise wait for the 30-minute hosted-service interval, or temporarily shorten `NotificationGenerationHostedService.Interval` to `TimeSpan.FromSeconds(10)` locally to test faster (revert before committing).
4. `curl -H "Authorization: Bearer <account A token>" .../api/notifications` and `curl -H "Authorization: Bearer <account B token>" .../api/notifications` — both must show a notification for their own overdue task, and must NOT show the other account's.

- [ ] **Step 5: Commit**

```bash
git add backend/SmartTask.Api/BackgroundServices/DailySmartRecalcHostedService.cs backend/SmartTask.Api/BackgroundServices/NotificationGenerationHostedService.cs
git commit -m "fix(backend): run Smart Engine recalc and notification generation per account, not globally"
```

---

### Task 8: End-to-end verification, build both apps, update ROADMAP

**Files:**
- Modify: `docs/roadmap/ROADMAP.md`

**Interfaces:**
- Consumes: everything from Tasks 1–7.
- Produces: nothing new — this is the whole-feature verification and documentation task.

- [ ] **Step 1: Full backend build**

Run: `cd backend && dotnet build -c Release`
Expected: `Build succeeded. 0 Warning(s) 0 Error(s)`

- [ ] **Step 2: Verify existing account keeps its data (Review Focus item)**

```bash
curl -sS -X POST https://smarttaskmanagers-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<your existing account email>","password":"<its password>"}'
```

Grab the returned token, then:

```bash
curl -sS https://smarttaskmanagers-production.up.railway.app/api/tasks -H "Authorization: Bearer <token>"
```

Expected: the same tasks that existed before this migration — same count, same names. If this list is empty or wrong, STOP — the backfill in Task 5 targeted the wrong account or didn't run; do not proceed to declare this done.

- [ ] **Step 3: Verify a brand-new account starts empty (Review Focus item)**

```bash
curl -sS -X POST https://smarttaskmanagers-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"verify-isolation-<random>@example.com","password":"Test1234","displayName":"Verify Isolation"}'
```

Grab the returned token, then:

```bash
curl -sS https://smarttaskmanagers-production.up.railway.app/api/tasks -H "Authorization: Bearer <new account token>"
curl -sS https://smarttaskmanagers-production.up.railway.app/api/projects -H "Authorization: Bearer <new account token>"
curl -sS https://smarttaskmanagers-production.up.railway.app/api/goals -H "Authorization: Bearer <new account token>"
curl -sS https://smarttaskmanagers-production.up.railway.app/api/habits -H "Authorization: Bearer <new account token>"
```

Expected: `[]` for all four. This is the exact bug the user reported — confirm it's actually fixed, not just built.

- [ ] **Step 4: Cross-account isolation (Review Focus item)**

Create a task on the new account from Step 3, then confirm the original account (Step 2's token) does NOT see it, and vice versa — the original account's tasks from Step 2 do NOT appear when listing with the new account's token.

- [ ] **Step 5: `GET` a specific id across accounts returns 404, not the row (Review Focus item)**

Using the new account's token, `GET /api/tasks/{id}` for a task id that belongs to the original account (from Step 2's list). Expected: `404`.

- [ ] **Step 6: Clean up the verification account**

The account created in Step 3 (and the debug user `debugtest2026@example.com` left over from an earlier CORS diagnostic session, if it's still there) has no delete-account endpoint in this API. Leave a note in the ROADMAP entry (Step 7 below) that these two test accounts exist in production and have not been cleaned up, since there is currently no way to delete a user through the API — do not silently leave this unmentioned.

- [ ] **Step 7: Update ROADMAP.md**

Add a new non-numbered entry (matching this session's established convention — see the "i18n (VI/EN) đã thực hiện" / "Dark mode đã thực hiện" entries already in the file) titled `Per-user data isolation đã thực hiện`, documenting:
- The bug: Tasks/Projects/Goals/Habits/Notifications had no `UserId` at all; every account shared one global dataset.
- The fix: EF Core global query filter + auto-assign on insert, scoped via `ICurrentUserContext`; migration backfilled existing rows to the earliest-created account.
- What was actually verified with real `curl` calls (Steps 2–5 above) vs. anything not verified.
- The two leftover unclean-up test accounts from Step 6, named explicitly.

- [ ] **Step 8: Build desktop and web apps**

```bash
cd /e/SmartTaskManager
npm run build:tauri
npm run build:web
```

Expected: both succeed (this task changes backend only, so this is a smoke check that nothing else broke — no frontend files were touched by this plan).

- [ ] **Step 9: Commit and push**

```bash
git add docs/roadmap/ROADMAP.md
git commit -m "docs: record per-user data isolation rollout in ROADMAP.md"
git push origin main
```
