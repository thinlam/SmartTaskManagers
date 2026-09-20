using SmartTask.Domain.Common;

namespace SmartTask.Domain.Users;

/// <summary>
/// New in Phase 22 — Personal Mode's Google Sheets app has no per-user
/// auth concept at all (one spreadsheet, one owner), so unlike Task/
/// Project/Goal/Habit there's no TASK_HEADERS-style column list to port;
/// this is an original, minimal design. Not a SyncableEntity — users
/// aren't part of the Task/Project/Goal/Habit sync Phase 28 targets.
/// </summary>
public sealed class User : Entity
{
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public string? DisplayName { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
