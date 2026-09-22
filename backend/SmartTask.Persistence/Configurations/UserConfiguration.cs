using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartTask.Domain.Users;

namespace SmartTask.Persistence.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.Property(u => u.Email).HasMaxLength(320).IsRequired();
        builder.Property(u => u.PasswordHash).HasMaxLength(1000).IsRequired();
        builder.Property(u => u.DisplayName).HasMaxLength(200);
        builder.Property(u => u.Language).HasMaxLength(5).IsRequired().HasDefaultValue("vi");
        builder.Property(u => u.Theme).HasMaxLength(5).IsRequired().HasDefaultValue("light");

        builder.HasIndex(u => u.Email).IsUnique();
    }
}
