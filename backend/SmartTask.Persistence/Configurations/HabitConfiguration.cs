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
    }
}
