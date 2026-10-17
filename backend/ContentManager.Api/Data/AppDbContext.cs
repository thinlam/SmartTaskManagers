using ContentManager.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace ContentManager.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Campaign> Campaigns => Set<Campaign>();
    public DbSet<Content> Contents => Set<Content>();
    public DbSet<MediaAsset> Media => Set<MediaAsset>();
    public DbSet<ActivityLog> Activities => Set<ActivityLog>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Email).HasMaxLength(256);
            e.Property(x => x.FullName).HasMaxLength(128);
            e.Property(x => x.Role).HasConversion<string>().HasMaxLength(16);
        });

        b.Entity<Campaign>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(16);
        });

        b.Entity<Content>(e =>
        {
            e.Property(x => x.Number).UseIdentityAlwaysColumn();
            e.HasIndex(x => x.Number).IsUnique();
            e.Property(x => x.Title).HasMaxLength(300);
            e.Property(x => x.Channel).HasConversion<string>().HasMaxLength(16);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(16);
            e.Property(x => x.Priority).HasConversion<string>().HasMaxLength(16);
            e.HasIndex(x => x.Status);
            e.HasIndex(x => x.ScheduledAt);
            e.HasOne(x => x.Assignee).WithMany().HasForeignKey(x => x.AssigneeId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Campaign).WithMany().HasForeignKey(x => x.CampaignId).OnDelete(DeleteBehavior.SetNull);
            e.HasMany(x => x.Media).WithOne().HasForeignKey(x => x.ContentId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<MediaAsset>(e =>
        {
            e.Property(x => x.FileName).HasMaxLength(260);
            e.Property(x => x.ContentType).HasMaxLength(128);
        });

        b.Entity<ActivityLog>(e =>
        {
            e.Property(x => x.Action).HasMaxLength(32);
            e.HasIndex(x => x.CreatedAt);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
        });
    }
}
