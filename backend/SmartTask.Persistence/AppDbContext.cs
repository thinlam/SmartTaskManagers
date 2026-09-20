using Microsoft.EntityFrameworkCore;
using SmartTask.Domain.Goals;
using SmartTask.Domain.Habits;
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
/// </summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<Habit> Habits => Set<Habit>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
