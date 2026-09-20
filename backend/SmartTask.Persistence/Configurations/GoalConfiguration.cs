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

        builder.Property(g => g.Area).HasConversion<string>().HasMaxLength(20);
        builder.Property(g => g.Status).HasConversion<string>().HasMaxLength(20);
    }
}
