using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartTask.Domain.Tasks;

namespace SmartTask.Persistence.Configurations;

public sealed class TaskAreaConfiguration : IEntityTypeConfiguration<TaskArea>
{
    public void Configure(EntityTypeBuilder<TaskArea> builder)
    {
        builder.ToTable("TaskAreas");

        builder.Property(a => a.Key).HasMaxLength(50).IsRequired();
        builder.Property(a => a.NameVi).HasMaxLength(100).IsRequired();
        builder.Property(a => a.NameEn).HasMaxLength(100).IsRequired();

        builder
            .HasMany(a => a.Tasks)
            .WithOne(t => t.TaskArea)
            .HasForeignKey(t => t.AreaId)
            .OnDelete(DeleteBehavior.SetNull);

        // A custom area's Key is never read, but keeping it unique per owner (system rows share
        // UserId = NULL, which MySQL's unique index treats as distinct values, so many system
        // rows with different keys coexist fine) avoids silent key collisions if code ever starts
        // reading it for a custom row too.
        builder.HasIndex(a => new { a.UserId, a.Key }).IsUnique();
    }
}
