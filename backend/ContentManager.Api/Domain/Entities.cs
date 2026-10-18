namespace ContentManager.Api.Domain;

public enum Channel { Facebook, TikTok, YouTube, Website, Zalo }

public enum ContentStatus { Idea, Drafting, Review, Approved, Scheduled, Published }

public enum Priority { Low, Medium, High }

public enum Role { Admin, Editor, Viewer }

public enum CampaignStatus { Planned, Active, Done }

public class Workspace
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Implemented by every row that belongs to exactly one workspace (tenant).</summary>
public interface IWorkspaceOwned
{
    Guid WorkspaceId { get; set; }
}

public class User
{
    public Guid WorkspaceId { get; set; }
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = "";
    public string FullName { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public Role Role { get; set; } = Role.Editor;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Campaign : IWorkspaceOwned
{
    public Guid WorkspaceId { get; set; }
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public CampaignStatus Status { get; set; } = CampaignStatus.Planned;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Content : IWorkspaceOwned
{
    public Guid WorkspaceId { get; set; }
    public Guid Id { get; set; } = Guid.NewGuid();
    /// <summary>Per-workspace sequence rendered as CNT-0001.</summary>
    public int Number { get; set; }
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public Channel Channel { get; set; }
    public ContentStatus Status { get; set; } = ContentStatus.Idea;
    public Priority Priority { get; set; } = Priority.Medium;
    public int Progress { get; set; }
    public Guid? AssigneeId { get; set; }
    public User? Assignee { get; set; }
    public Guid? CampaignId { get; set; }
    public Campaign? Campaign { get; set; }
    public DateTime? ScheduledAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<MediaAsset> Media { get; set; } = [];
}

public class MediaAsset : IWorkspaceOwned
{
    public Guid WorkspaceId { get; set; }
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FileName { get; set; } = "";
    public string StoredName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long Size { get; set; }
    public Guid? UploadedById { get; set; }
    public Guid? ContentId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ActivityLog : IWorkspaceOwned
{
    public Guid WorkspaceId { get; set; }
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public Guid? ContentId { get; set; }
    /// <summary>created | updated | status | published | uploaded | deleted</summary>
    public string Action { get; set; } = "";
    public string Subject { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
