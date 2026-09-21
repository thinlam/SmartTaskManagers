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
        builder.Property(t => t.Tags).HasMaxLength(1000);
        builder.Property(t => t.RecommendedAction).HasMaxLength(500);
        builder.Property(t => t.Notes).HasMaxLength(4000);
        builder.Property(t => t.ExternalId).HasMaxLength(50);

        builder.Property(t => t.Area).HasConversion<string>().HasMaxLength(20);
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

        builder.HasIndex(t => t.Status);
        builder.HasIndex(t => t.DueDate);

        // Phase 28 — the join key sync uses to find "the row this Sheets
        // TaskId already maps to". MySQL has no filtered indexes (the old
        // SQL Server `HasFilter("[ExternalId] IS NOT NULL")` was dropped),
        // but a MySQL UNIQUE index already permits multiple NULL values,
        // so any number of API/Desktop-only tasks (ExternalId = null) can
        // coexist without tripping the uniqueness constraint — identical
        // behavior to the SQL Server filtered index.
        builder.HasIndex(t => t.ExternalId).IsUnique();
    }
}
