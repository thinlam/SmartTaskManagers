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
        builder.Property(p => p.Color).HasMaxLength(7);

        builder.Property(p => p.Area).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Health).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Priority).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Field).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Category).HasConversion<string>().HasMaxLength(20);

        builder
            .HasOne<SmartTask.Domain.Users.User>()
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(p => p.UserId);

        // Phase 28 — see TaskItemConfiguration's identical index for why a plain
        // UNIQUE index (no HasFilter) is the MySQL-compatible equivalent of
        // SQL Server's filtered index: MySQL UNIQUE allows multiple NULLs.
        builder.HasIndex(p => new { p.UserId, p.ExternalId }).IsUnique();

        // "Tên dự án (bắt buộc, không trùng)" — enforced at the DB level too,
        // not just ProjectService's pre-check, to close the race between two
        // concurrent creates with the same name. MySQL's default collation on
        // this column is case-insensitive, matching ProjectService's own
        // case-insensitive duplicate check.
        builder.HasIndex(p => new { p.UserId, p.Name }).IsUnique();
    }
}
