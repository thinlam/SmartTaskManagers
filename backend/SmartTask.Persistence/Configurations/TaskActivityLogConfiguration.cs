using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartTask.Domain.Tasks;

namespace SmartTask.Persistence.Configurations;

public sealed class TaskActivityLogConfiguration : IEntityTypeConfiguration<TaskActivityLog>
{
    public void Configure(EntityTypeBuilder<TaskActivityLog> builder)
    {
        builder.ToTable("TaskActivityLogs");

        builder.Property(l => l.Action).HasMaxLength(50).IsRequired();
        builder.Property(l => l.OldValue).HasMaxLength(100);
        builder.Property(l => l.NewValue).HasMaxLength(100);

        builder
            .HasOne(l => l.Task)
            .WithMany()
            .HasForeignKey(l => l.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(l => l.TaskId);
        builder.HasIndex(l => l.UserId);
    }
}
