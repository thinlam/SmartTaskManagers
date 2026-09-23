using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartTask.Domain.Notifications;

namespace SmartTask.Persistence.Configurations;

public sealed class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("Notifications");

        builder.Property(n => n.Title).HasMaxLength(200).IsRequired();
        builder.Property(n => n.Message).HasMaxLength(1000).IsRequired();
        builder.Property(n => n.EntityType).HasMaxLength(20);
        builder.Property(n => n.Type).HasConversion<string>().HasMaxLength(30);

        builder
            .HasOne<SmartTask.Domain.Users.User>()
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(n => n.UserId);

        builder.HasIndex(n => n.IsRead);
        builder.HasIndex(n => n.CreatedAt);

        // NotificationService.GenerateAsync's dedupe check — "is there
        // already an unread notification for this exact (Type, EntityId)"
        // — filters on this pair every run, so it's worth an index.
        builder.HasIndex(n => new { n.Type, n.EntityId });
    }
}
