using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartTask.Domain.Tasks;

namespace SmartTask.Persistence.Configurations;

public sealed class TagConfiguration : IEntityTypeConfiguration<Tag>
{
    public void Configure(EntityTypeBuilder<Tag> builder)
    {
        builder.ToTable("Tags");

        builder.Property(t => t.Name).HasMaxLength(30).IsRequired();
        builder.Property(t => t.NormalizedName).HasMaxLength(30).IsRequired();

        builder
            .HasOne<SmartTask.Domain.Users.User>()
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(t => t.UserId);

        // Case-insensitive uniqueness per user — NormalizedName is already lowercased, so a
        // plain unique index on it is enough; no need for a collation override.
        builder.HasIndex(t => new { t.UserId, t.NormalizedName }).IsUnique();
    }
}
