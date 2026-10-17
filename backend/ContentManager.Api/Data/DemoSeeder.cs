using ContentManager.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace ContentManager.Api.Data;

/// <summary>Fills an empty database with realistic demo data (Seed:Demo=true).</summary>
public static class DemoSeeder
{
    public const string DemoEmail = "admin@contentmanager.local";
    public const string DemoPassword = "Demo@1234";

    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Users.AnyAsync()) return;

        string hash(string p) => BCrypt.Net.BCrypt.HashPassword(p);
        var admin = new User { Email = DemoEmail, FullName = "Minh Anh", Role = Role.Admin, PasswordHash = hash(DemoPassword) };
        var people = new[]
        {
            admin,
            new User { Email = "quanghuy@contentmanager.local", FullName = "Quang Huy", Role = Role.Editor, PasswordHash = hash(DemoPassword) },
            new User { Email = "thaovy@contentmanager.local", FullName = "Thảo Vy", Role = Role.Editor, PasswordHash = hash(DemoPassword) },
            new User { Email = "quocbao@contentmanager.local", FullName = "Quốc Bảo", Role = Role.Editor, PasswordHash = hash(DemoPassword) },
            new User { Email = "lanchi@contentmanager.local", FullName = "Lan Chi", Role = Role.Editor, PasswordHash = hash(DemoPassword) },
            new User { Email = "hoangnam@contentmanager.local", FullName = "Hoàng Nam", Role = Role.Viewer, PasswordHash = hash(DemoPassword) },
            new User { Email = "thuha@contentmanager.local", FullName = "Thu Hà", Role = Role.Editor, PasswordHash = hash(DemoPassword) },
        };
        db.Users.AddRange(people);

        var today = DateTime.UtcNow.Date;
        var campaigns = new[]
        {
            new Campaign { Name = "Chiến dịch mùa thu", Description = "Ra mắt bộ sưu tập mùa thu trên toàn bộ kênh.", Status = CampaignStatus.Active, StartDate = today.AddDays(-20), EndDate = today.AddDays(40) },
            new Campaign { Name = "TikTok Challenge", Description = "Cuộc thi 7 ngày sáng tạo nội dung cùng cộng đồng.", Status = CampaignStatus.Active, StartDate = today.AddDays(-5), EndDate = today.AddDays(25) },
            new Campaign { Name = "Product Education", Description = "Chuỗi nội dung hướng dẫn sử dụng sản phẩm.", Status = CampaignStatus.Active, StartDate = today.AddDays(-30), EndDate = today.AddDays(60) },
            new Campaign { Name = "Ra mắt sản phẩm", Description = "Chiến dịch truyền thông cho sản phẩm mới.", Status = CampaignStatus.Planned, StartDate = today.AddDays(10), EndDate = today.AddDays(45) },
            new Campaign { Name = "Always-on Content", Description = "Nội dung duy trì thường xuyên trên các kênh.", Status = CampaignStatus.Active, StartDate = today.AddDays(-90), EndDate = null },
        };
        db.Campaigns.AddRange(campaigns);

        // (title, channel, status, priority, assignee idx, campaign idx, day offset, hour)
        var seed = new (string, Channel, ContentStatus, Priority, int, int, int, int)[]
        {
            ("Ra mắt bộ sưu tập mùa thu", Channel.Facebook, ContentStatus.Scheduled, Priority.High, 0, 0, 0, 9),
            ("Cuộc thi 7 ngày sáng tạo TikTok", Channel.TikTok, ContentStatus.Drafting, Priority.High, 3, 1, 2, 14),
            ("Video hướng dẫn dùng tính năng Lịch đăng", Channel.YouTube, ContentStatus.Review, Priority.Medium, 4, 2, 4, 10),
            ("Bài giới thiệu sản phẩm Content Manager", Channel.Website, ContentStatus.Idea, Priority.Low, 5, 3, 7, 9),
            ("Tips tối ưu caption cho Facebook", Channel.Facebook, ContentStatus.Published, Priority.Medium, 6, 4, -3, 9),
            ("Video hậu trường buổi chụp ảnh", Channel.TikTok, ContentStatus.Review, Priority.Medium, 3, 0, 5, 11),
            ("Livestream ra mắt caption Facebook", Channel.Facebook, ContentStatus.Approved, Priority.High, 4, 0, 1, 20),
            ("Review sản phẩm từ chuyên gia", Channel.YouTube, ContentStatus.Approved, Priority.Medium, 5, 2, 3, 15),
            ("Landing page chiến dịch Black Friday", Channel.Website, ContentStatus.Approved, Priority.Medium, 0, 3, 9, 8),
            ("Chương trình ưu đãi tháng 10 trên Zalo", Channel.Zalo, ContentStatus.Drafting, Priority.Medium, 2, 0, 6, 9),
            ("Ra mắt bộ sưu tập mùa thu - teaser", Channel.Facebook, ContentStatus.Drafting, Priority.High, 0, 0, 0, 16),
            ("Case study: Khách hàng thành công", Channel.Website, ContentStatus.Drafting, Priority.Low, 3, 4, -1, 10),
            ("Mẹo tối ưu nội dung Facebook", Channel.Facebook, ContentStatus.Scheduled, Priority.Medium, 0, 4, 0, 15),
            ("Trend biến hình cùng sản phẩm", Channel.TikTok, ContentStatus.Scheduled, Priority.High, 1, 1, 1, 11),
            ("Hướng dẫn sử dụng tính năng mới", Channel.YouTube, ContentStatus.Scheduled, Priority.Medium, 2, 2, 8, 20),
            ("Trào lưu nhảy cùng sản phẩm", Channel.TikTok, ContentStatus.Published, Priority.High, 3, 1, -4, 18),
            ("Hướng dẫn sử dụng sản phẩm cơ bản", Channel.YouTube, ContentStatus.Published, Priority.Medium, 4, 2, -5, 10),
            ("Thông báo lịch nghỉ lễ 10/10", Channel.Zalo, ContentStatus.Published, Priority.Medium, 5, 4, -8, 8),
            ("Bài blog: Xu hướng marketing 2024", Channel.Website, ContentStatus.Published, Priority.Low, 3, 4, -9, 9),
            ("Duyệt video cuộc thi TikTok", Channel.TikTok, ContentStatus.Review, Priority.High, 0, 1, 0, 10),
            ("Hoàn thiện bài giới thiệu sản phẩm mới", Channel.Website, ContentStatus.Drafting, Priority.High, 1, 3, 0, 14),
            ("Đăng bài hướng dẫn sử dụng Content Manager", Channel.Facebook, ContentStatus.Scheduled, Priority.Medium, 2, 2, 1, 9),
            ("Ý tưởng series Q&A cùng chuyên gia", Channel.YouTube, ContentStatus.Idea, Priority.Medium, 4, 2, 12, 10),
            ("Ý tưởng minigame tặng quà Zalo", Channel.Zalo, ContentStatus.Idea, Priority.Low, 6, 4, 14, 9),
            ("Infographic quy trình duyệt nội dung", Channel.Website, ContentStatus.Idea, Priority.Medium, 5, 4, 11, 9),
            ("Short video mẹo dùng Kanban", Channel.TikTok, ContentStatus.Published, Priority.Medium, 1, 2, -12, 19),
            ("Bài tổng kết tuần trên Facebook", Channel.Facebook, ContentStatus.Published, Priority.Low, 0, 4, -15, 9),
            ("Thông báo cập nhật phiên bản mới", Channel.Zalo, ContentStatus.Published, Priority.Medium, 6, 4, -18, 11),
            ("Video giới thiệu đội ngũ", Channel.YouTube, ContentStatus.Published, Priority.Low, 2, 4, -22, 10),
            ("Bài PR báo chí ra mắt sản phẩm", Channel.Website, ContentStatus.Review, Priority.High, 3, 3, 10, 9),
        };

        foreach (var (title, channel, status, priority, who, camp, day, hour) in seed)
        {
            var when = today.AddDays(day).AddHours(hour);
            var created = when.AddDays(-Random.Shared.Next(2, 10));
            db.Contents.Add(new Content
            {
                Title = title,
                Description = $"Nội dung \"{title}\" thuộc {campaigns[camp].Name}.",
                Channel = channel,
                Status = status,
                Priority = priority,
                Progress = Services.Mapping.DefaultProgress(status),
                Assignee = people[who],
                Campaign = campaigns[camp],
                ScheduledAt = when,
                PublishedAt = status == ContentStatus.Published ? when : null,
                CreatedAt = created,
                UpdatedAt = status == ContentStatus.Published ? when : DateTime.UtcNow.AddHours(-Random.Shared.Next(1, 72)),
            });
        }

        db.Activities.AddRange(
            new ActivityLog { User = people[0], Action = "published", Subject = "Mẹo tối ưu nội dung Facebook", CreatedAt = DateTime.UtcNow.AddMinutes(-5) },
            new ActivityLog { User = people[1], Action = "status", Subject = "Trend biến hình cùng sản phẩm", CreatedAt = DateTime.UtcNow.AddMinutes(-18) },
            new ActivityLog { User = people[2], Action = "uploaded", Subject = "HDSD tính năng mới.mp4", CreatedAt = DateTime.UtcNow.AddMinutes(-45) },
            new ActivityLog { User = people[3], Action = "status", Subject = "Giới thiệu sản phẩm mới", CreatedAt = DateTime.UtcNow.AddHours(-1) });

        await db.SaveChangesAsync();
    }
}
