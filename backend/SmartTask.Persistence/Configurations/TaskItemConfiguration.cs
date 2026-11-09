using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartTask.Domain.Tasks;

namespace SmartTask.Persistence.Configurations;

public sealed class TaskItemConfiguration : IEntityTypeConfiguration<TaskItem>
{
    public void Configure(EntityTypeBuilder<TaskItem> builder)
    {
        builder.ToTable("Tasks");

        builder.Property(t => t.Name).HasMaxLength(500).IsRequired();
        builder.Property(t => t.Category).HasMaxLength(100);
#pragma warning disable CS0618 // LegacyTagsCsv is obsolete by design — still mapped for the historical column.
        builder.Property(t => t.LegacyTagsCsv).HasMaxLength(1000).HasColumnName("Tags");
#pragma warning restore CS0618
        builder.Property(t => t.RecommendedAction).HasMaxLength(500);
        builder.Property(t => t.Notes).HasMaxLength(4000);
        builder.Property(t => t.ExternalId).HasMaxLength(50);
        builder.Property(t => t.AttachmentUrl).HasMaxLength(2000);

        // Reuses the existing sync-era Version column as an optimistic-concurrency token —
        // EF includes it in every UPDATE's WHERE clause and throws DbUpdateConcurrencyException
        // on a stale write, instead of adding a new RowVersion column (GĐ redesign, 2026-11-09).
        builder.Property(t => t.Version).IsConcurrencyToken();

#pragma warning disable CS0618 // Area is obsolete by design — still mapped for the historical column.
        builder.Property(t => t.Area).HasConversion<string>().HasMaxLength(20);
#pragma warning restore CS0618
        builder.Property(t => t.Priority).HasConversion<string>().HasMaxLength(20);
        builder.Property(t => t.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(t => t.Energy).HasConversion<string>().HasMaxLength(20);
        builder.Property(t => t.Context).HasConversion<string>().HasMaxLength(20);
        builder.Property(t => t.RecurringType).HasConversion<string>().HasMaxLength(20);
        builder.Property(t => t.Risk).HasConversion<string>().HasMaxLength(20);

        // Deleting a Project/Goal clears the reference on its tasks rather than deleting
        // them — matches the "cascade clear" behavior packages/hooks's useProjects/useGoals
        // READMEs already documented as the correct real-backend approach.
        builder
            .HasOne(t => t.Project)
            .WithMany()
            .HasForeignKey(t => t.ProjectId)
            .OnDelete(DeleteBehavior.SetNull);

        builder
            .HasOne(t => t.Goal)
            .WithMany()
            .HasForeignKey(t => t.GoalId)
            .OnDelete(DeleteBehavior.SetNull);

        // Self-referencing FK: SQL Server rejects SetNull here with "may cause cycles or
        // multiple cascade paths" (verified — the first migration attempt failed on this
        // exact error). Restrict means deleting a task other tasks depend on is blocked at
        // the DB level until the app clears DependencyTaskId itself.
        builder
            .HasOne(t => t.DependencyTask)
            .WithMany()
            .HasForeignKey(t => t.DependencyTaskId)
            .OnDelete(DeleteBehavior.Restrict);

        // Same Restrict reasoning as DependencyTask above — a second self-referencing FK
        // on the same table, SetNull would hit the identical "multiple cascade paths" error.
        // TaskService clears ParentTaskId on a subtask before a parent's hard delete would
        // ever run (soft delete makes this moot in practice, but keep DB-level safety too).
        builder
            .HasOne(t => t.ParentTask)
            .WithMany()
            .HasForeignKey(t => t.ParentTaskId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne<SmartTask.Domain.Users.User>()
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(t => t.UserId);

        builder.HasIndex(t => t.Status);
        builder.HasIndex(t => t.DueDate);
        builder.HasIndex(t => new { t.Status, t.DueDate });
        builder.HasIndex(t => t.Category);

        // Phase 28 — the join key sync uses to find "the row this Sheets
        // TaskId already maps to". MySQL has no filtered indexes (the old
        // SQL Server `HasFilter("[ExternalId] IS NOT NULL")` was dropped),
        // but a MySQL UNIQUE index already permits multiple NULL values,
        // so any number of API/Desktop-only tasks (ExternalId = null) can
        // coexist without tripping the uniqueness constraint — identical
        // behavior to the SQL Server filtered index.
        builder.HasIndex(t => new { t.UserId, t.ExternalId }).IsUnique();

        // Normalized Tags relation — implicit many-to-many via skip navigation, EF creates
        // and manages the join table itself (no C# entity needed for the join row).
        builder
            .HasMany(t => t.Tags)
            .WithMany(tag => tag.Tasks)
            .UsingEntity(j => j.ToTable("TaskTags"));
    }
}
