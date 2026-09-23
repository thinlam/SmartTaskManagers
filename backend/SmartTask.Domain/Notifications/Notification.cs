using SmartTask.Domain.Common;

namespace SmartTask.Domain.Notifications;

/// <summary>
/// Phase 30 — entirely new, no Sheets precedent (grepping
/// apps/google-sheets/src confirmed no notif/email/reminder logic
/// anywhere; docs/audit/PHASE_00_AUDIT_REPORT.md's own gap list already
/// named this: "... Notifications — chưa làm"). Design confirmed with the
/// user before building: 4 trigger rules (task overdue/due-soon, habit
/// streak at risk, goal at-risk, sync push item failures) and a real
/// persisted table with read/unread state, not a live-computed list —
/// matches packages/types's long-documented "Notification" type and
/// design-tokens.md's "NotificationItem" component, neither of which
/// existed as real code until now.
/// </summary>
public enum NotificationType
{
    TaskOverdue,
    TaskDueSoon,
    HabitStreakAtRisk,
    GoalAtRisk,
    SyncFailed,
}

public sealed class Notification : Entity
{
    /// <summary>The account this notification is for. Set automatically by AppDbContext.SaveChangesAsync on insert — never set this directly.</summary>
    public Guid UserId { get; set; }

    public required NotificationType Type { get; set; }
    public required string Title { get; set; }
    public required string Message { get; set; }

    /// <summary>"Task"/"Habit"/"Goal", or null for a SyncFailed notification with no persisted source row.</summary>
    public string? EntityType { get; set; }

    /// <summary>The Task/Habit/Goal this notification is about, if any.</summary>
    public Guid? EntityId { get; set; }

    public bool IsRead { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
