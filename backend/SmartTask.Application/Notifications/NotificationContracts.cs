using SmartTask.Domain.Notifications;

namespace SmartTask.Application.Notifications;

public sealed record NotificationResponse(
    Guid Id,
    NotificationType Type,
    string Title,
    string Message,
    string? EntityType,
    Guid? EntityId,
    bool IsRead,
    DateTimeOffset CreatedAt
);
