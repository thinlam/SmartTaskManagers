using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartTask.Domain.Projects;

namespace SmartTask.Persistence.Configurations;

public sealed class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> builder)
    {
        builder.ToTable("Projects");

        builder.Property(p => p.Name).HasMaxLength(200).IsRequired();
        builder.Property(p => p.Description).HasMaxLength(4000);
        builder.Property(p => p.ExternalId).HasMaxLength(50);

        builder.Property(p => p.Area).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Health).HasConversion<string>().HasMaxLength(20);

        // Phase 28 — see TaskItemConfiguration's identical index for why a plain
        // UNIQUE index (no HasFilter) is the MySQL-compatible equivalent of
        // SQL Server's filtered index: MySQL UNIQUE allows multiple NULLs.
        builder.HasIndex(p => p.ExternalId).IsUnique();
    }
}
