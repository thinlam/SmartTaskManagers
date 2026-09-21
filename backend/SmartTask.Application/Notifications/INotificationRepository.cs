using SmartTask.Domain.Notifications;

namespace SmartTask.Application.Notifications;

/// <summary>Application depends on this; SmartTask.Persistence implements it against AppDbContext.</summary>
public interface INotificationRepository
{
    Task<List<Notification>> GetAllAsync(int limit, CancellationToken cancellationToken = default);
    Task<int> GetUnreadCountAsync(CancellationToken cancellationToken = default);
    Task<Notification?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Dedupe check for NotificationService.GenerateAsync: pass
    /// <paramref name="entityId"/> for entity-linked notifications
    /// (Task/Habit/Goal — matched by Type + EntityId), or
    /// <paramref name="title"/> for one with no persisted source row
    /// (SyncFailed — matched by Type + exact Title instead).
    /// </summary>
    Task<bool> HasUnreadAsync(
        NotificationType type,
        Guid? entityId,
        string? title,
        CancellationToken cancellationToken = default
    );

    Task AddAsync(Notification notification, CancellationToken cancellationToken = default);
    Task MarkAllReadAsync(CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
