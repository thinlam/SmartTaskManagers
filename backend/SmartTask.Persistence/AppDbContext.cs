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
