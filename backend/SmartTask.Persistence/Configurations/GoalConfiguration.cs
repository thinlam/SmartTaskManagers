using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartTask.Domain.Goals;

namespace SmartTask.Persistence.Configurations;

public sealed class GoalConfiguration : IEntityTypeConfiguration<Goal>
{
    public void Configure(EntityTypeBuilder<Goal> builder)
    {
        builder.ToTable("Goals");

        builder.Property(g => g.Name).HasMaxLength(200).IsRequired();
        builder.Property(g => g.ExternalId).HasMaxLength(50);

        builder.Property(g => g.Area).HasConversion<string>().HasMaxLength(20);
        builder.Property(g => g.Status).HasConversion<string>().HasMaxLength(20);

        builder
            .HasOne<SmartTask.Domain.Users.User>()
            .WithMany()
            .HasForeignKey(g => g.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(g => g.UserId);

        // Phase 28 — see TaskItemConfiguration's identical index for why a plain
        // UNIQUE index (no HasFilter) is the MySQL-compatible equivalent of
        // SQL Server's filtered index: MySQL UNIQUE allows multiple NULLs.
        builder.HasIndex(g => g.ExternalId).IsUnique();
    }
}
