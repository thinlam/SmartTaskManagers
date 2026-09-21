using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartTask.Domain.Habits;

namespace SmartTask.Persistence.Configurations;

public sealed class HabitConfiguration : IEntityTypeConfiguration<Habit>
{
    public void Configure(EntityTypeBuilder<Habit> builder)
    {
        builder.ToTable("Habits");

        builder.Property(h => h.Name).HasMaxLength(200).IsRequired();
        builder.Property(h => h.Frequency).HasConversion<string>().HasMaxLength(20);
        builder.Property(h => h.ExternalId).HasMaxLength(50);

        // Phase 28 — see TaskItemConfiguration's identical index for why a plain
        // UNIQUE index (no HasFilter) is the MySQL-compatible equivalent of
        // SQL Server's filtered index: MySQL UNIQUE allows multiple NULLs.
        builder.HasIndex(h => h.ExternalId).IsUnique();
    }
}
