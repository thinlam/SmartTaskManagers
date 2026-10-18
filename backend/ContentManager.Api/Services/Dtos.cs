using ContentManager.Api.Domain;

namespace ContentManager.Api.Services;

public record UserRef(Guid Id, string FullName);
public record CampaignRef(Guid Id, string Name);
public record MediaDto(Guid Id, string FileName, string ContentType, long Size, Guid? ContentId, DateTime CreatedAt, string? UploadedBy);

public record ContentDto(
    Guid Id, string Code, string Title, string? Description,
    Channel Channel, ContentStatus Status, Priority Priority, int Progress,
    UserRef? Assignee, CampaignRef? Campaign,
    DateTime? ScheduledAt, DateTime? PublishedAt, DateTime CreatedAt, DateTime UpdatedAt,
    List<MediaDto> Media);

public record ContentInput(
    string? Title, string? Description, Channel? Channel, ContentStatus? Status, Priority? Priority,
    int? Progress, Guid? AssigneeId, Guid? CampaignId, DateTime? ScheduledAt, List<Guid>? MediaIds);

public record StatusInput(ContentStatus Status);
public record BulkDeleteInput(List<Guid> Ids);

public record RegisterInput(string Email, string FullName, string Password);
public record LoginInput(string Email, string Password);
public record ProfileInput(string FullName);
public record PasswordInput(string CurrentPassword, string NewPassword);
public record WorkspaceInput(string Name);
public record WorkspaceDto(Guid Id, string Name, DateTime CreatedAt, int MemberCount, int ContentCount, long MediaBytes);
public record UserDto(Guid Id, string Email, string FullName, Role Role, DateTime CreatedAt);
public record AuthResult(string Token, DateTime ExpiresAt, UserDto User);
public record MemberInput(string Email, string FullName, string Password, Role Role);
public record RoleInput(Role Role);

public record CampaignInput(string? Name, string? Description, DateTime? StartDate, DateTime? EndDate, CampaignStatus? Status);
public record CampaignDto(Guid Id, string Name, string? Description, DateTime? StartDate, DateTime? EndDate, CampaignStatus Status, int ContentCount, int PublishedCount);

public record PagedResult<T>(List<T> Items, int Total, int Page, int PageSize);
public record ActivityDto(Guid Id, string Action, string Subject, Guid? ContentId, UserRef? User, DateTime CreatedAt);

public static class Mapping
{
    public static string Code(int number) => $"CNT-{number:0000}";

    public static ContentDto ToDto(this Content c) => new(
        c.Id, Code(c.Number), c.Title, c.Description, c.Channel, c.Status, c.Priority, c.Progress,
        c.Assignee is null ? null : new UserRef(c.Assignee.Id, c.Assignee.FullName),
        c.Campaign is null ? null : new CampaignRef(c.Campaign.Id, c.Campaign.Name),
        c.ScheduledAt, c.PublishedAt, c.CreatedAt, c.UpdatedAt,
        c.Media.Select(m => m.ToDto(null)).ToList());

    public static MediaDto ToDto(this MediaAsset m, string? uploadedBy) =>
        new(m.Id, m.FileName, m.ContentType, m.Size, m.ContentId, m.CreatedAt, uploadedBy);

    public static UserDto ToDto(this User u) => new(u.Id, u.Email, u.FullName, u.Role, u.CreatedAt);

    public static int DefaultProgress(ContentStatus s) => s switch
    {
        ContentStatus.Idea => 20,
        ContentStatus.Drafting => 55,
        ContentStatus.Review => 80,
        ContentStatus.Approved => 90,
        ContentStatus.Scheduled => 95,
        _ => 100,
    };

    public static DateTime? Utc(DateTime? d) => d is null ? null
        : d.Value.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(d.Value, DateTimeKind.Utc) : d.Value.ToUniversalTime();
}
