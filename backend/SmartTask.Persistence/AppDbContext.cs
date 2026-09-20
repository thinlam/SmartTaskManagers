using Microsoft.EntityFrameworkCore;

namespace SmartTask.Persistence;

/// <summary>
/// Deliberately empty — no DbSets, no OnModelCreating, no migrations yet.
/// Schema (Tasks/Projects/Goals/Habits, from TASK_HEADERS/PROJECT_HEADERS/
/// GOAL_HEADERS/HABIT_HEADERS in apps/google-sheets/src/00_Constants.gs,
/// plus the sync columns noted in docs/architecture/ARCHITECTURE.md — Id
/// UUID/SyncStatus/LastSyncedAt/Version) is Phase 21's job. This class
/// exists now only to prove the EF Core + SQL Server package wiring and
/// DI registration (see DependencyInjection.cs) actually builds and
/// resolves.
/// </summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options);
