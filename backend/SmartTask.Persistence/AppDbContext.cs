using Microsoft.EntityFrameworkCore;
using SmartTask.Domain.Goals;
using SmartTask.Domain.Habits;
using SmartTask.Domain.Projects;
using SmartTask.Domain.Tasks;

namespace SmartTask.Persistence;

/// <summary>
/// Schema (Phase 21) — DbSets and their EntityTypeConfiguration classes
/// (see Configurations/) match TASK_HEADERS/PROJECT_HEADERS/
/// GOAL_HEADERS/HABIT_HEADERS in apps/google-sheets/src/00_Constants.gs,
/// plus the sync columns (Id UUID/SyncStatus/LastSyncedAt/Version) from
/// SmartTask.Domain.Common.SyncableEntity. No Smart Engine compute logic,
/// no auth, no repositories yet — those are later phases.
/// </summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<Habit> Habits => Set<Habit>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
