namespace SmartTask.Application.Notifications;

public interface INotificationService
{
    Task<List<NotificationResponse>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<int> GetUnreadCountAsync(CancellationToken cancellationToken = default);
    Task<NotificationResponse?> MarkReadAsync(Guid id, CancellationToken cancellationToken = default);
    Task MarkAllReadAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Scans Tasks/Habits/Goals for the 4 trigger rules (task overdue,
    /// task due soon, habit streak at risk, goal at risk) and creates a
    /// Notification for each newly-detected case — skips anything that
    /// already has an unread notification for the same (Type, EntityId),
    /// so a still-true condition doesn't spam a fresh row every run.
    /// Returns how many notifications were created.
    /// </summary>
    Task<int> GenerateAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Called by SyncService (Phase 28) when a push item fails —
    /// entityType/externalId identify what failed for a title-based
    /// dedupe (SyncFailed notifications have no EntityId, since the
    /// failing item was never persisted).
    /// </summary>
    Task NotifySyncFailureAsync(
        string entityType,
        string externalId,
        string message,
        CancellationToken cancellationToken = default
    );
}
