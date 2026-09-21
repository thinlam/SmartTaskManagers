using SmartTask.Application.Abstractions;
using SmartTask.Application.Goals;
using SmartTask.Application.Habits;
using SmartTask.Application.Tasks;
using SmartTask.Domain.Enums;
using SmartTask.Domain.Notifications;

namespace SmartTask.Application.Notifications;

/// <summary>
/// The 4 trigger rules confirmed with the user before building this
/// phase — see Notification.cs's doc comment. Each rule reads fields
/// that already exist (no new columns needed on Task/Habit/Goal).
/// </summary>
public sealed class NotificationService(
    INotificationRepository notificationRepository,
    ITaskRepository taskRepository,
    IHabitRepository habitRepository,
    IGoalRepository goalRepository,
    IDateTimeProvider dateTimeProvider
) : INotificationService
{
    private const int NotificationListLimit = 100;

    public async Task<List<NotificationResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var notifications = await notificationRepository.GetAllAsync(NotificationListLimit, cancellationToken);
        return notifications.Select(ToResponse).ToList();
    }

    public Task<int> GetUnreadCountAsync(CancellationToken cancellationToken = default) =>
        notificationRepository.GetUnreadCountAsync(cancellationToken);

    public async Task<NotificationResponse?> MarkReadAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var notification = await notificationRepository.GetByIdAsync(id, cancellationToken);
        if (notification is null)
        {
            return null;
        }

        notification.IsRead = true;
        await notificationRepository.SaveChangesAsync(cancellationToken);
        return ToResponse(notification);
    }

    public Task MarkAllReadAsync(CancellationToken cancellationToken = default) =>
        notificationRepository.MarkAllReadAsync(cancellationToken);

    public async Task<int> GenerateAsync(CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(dateTimeProvider.UtcNow.UtcDateTime);
        var created = 0;

        created += await GenerateTaskNotificationsAsync(today, cancellationToken);
        created += await GenerateHabitNotificationsAsync(today, cancellationToken);
        created += await GenerateGoalNotificationsAsync(cancellationToken);

        if (created > 0)
        {
            await notificationRepository.SaveChangesAsync(cancellationToken);
        }

        return created;
    }

    public async Task NotifySyncFailureAsync(
        string entityType,
        string externalId,
        string message,
        CancellationToken cancellationToken = default
    )
    {
        var title = $"Sync failed: {entityType} {externalId}";
        if (await notificationRepository.HasUnreadAsync(NotificationType.SyncFailed, null, title, cancellationToken))
        {
            return;
        }

        await notificationRepository.AddAsync(
            new Notification
            {
                Type = NotificationType.SyncFailed,
                Title = title,
                Message = message,
                EntityType = null,
                EntityId = null,
                CreatedAt = dateTimeProvider.UtcNow,
            },
            cancellationToken
        );
        await notificationRepository.SaveChangesAsync(cancellationToken);
    }

    private async Task<int> GenerateTaskNotificationsAsync(DateOnly today, CancellationToken cancellationToken)
    {
        var tasks = await taskRepository.GetAllAsync(cancellationToken);
        var created = 0;

        foreach (var task in tasks)
        {
            if (task.Status == TaskStatusType.Completed || task.DueDate is not { } dueDate)
            {
                continue;
            }

            var daysUntilDue = dueDate.DayNumber - today.DayNumber;
            NotificationType? type =
                daysUntilDue < 0 ? NotificationType.TaskOverdue
                : daysUntilDue <= AppDefaults.DueSoonDays ? NotificationType.TaskDueSoon
                : null;

            if (type is not { } notificationType)
            {
                continue;
            }

            if (
                await notificationRepository.HasUnreadAsync(
                    notificationType,
                    task.Id,
                    null,
                    cancellationToken
                )
            )
            {
                continue;
            }

            var (title, message) =
                notificationType == NotificationType.TaskOverdue
                    ? ($"Overdue: {task.Name}", $"\"{task.Name}\" was due {-daysUntilDue} day(s) ago.")
                    : ($"Due soon: {task.Name}", $"\"{task.Name}\" is due in {daysUntilDue} day(s).");

            await notificationRepository.AddAsync(
                new Notification
                {
                    Type = notificationType,
                    Title = title,
                    Message = message,
                    EntityType = "Task",
                    EntityId = task.Id,
                    CreatedAt = dateTimeProvider.UtcNow,
                },
                cancellationToken
            );
            created++;
        }

        return created;
    }

    private async Task<int> GenerateHabitNotificationsAsync(DateOnly today, CancellationToken cancellationToken)
    {
        var habits = await habitRepository.GetAllAsync(cancellationToken);
        var created = 0;

        foreach (var habit in habits)
        {
            // Only meaningful for a Daily habit with a streak actually at
            // stake — a habit with no streak yet has nothing to lose, and
            // "at risk of missing today" doesn't apply to Weekly/Custom
            // cadences the same way.
            if (habit.Frequency != HabitFrequencyType.Daily || habit.Streak <= 0)
            {
                continue;
            }

            if (habit.LastCompletedDate == today)
            {
                continue;
            }

            if (
                await notificationRepository.HasUnreadAsync(
                    NotificationType.HabitStreakAtRisk,
                    habit.Id,
                    null,
                    cancellationToken
                )
            )
            {
                continue;
            }

            await notificationRepository.AddAsync(
                new Notification
                {
                    Type = NotificationType.HabitStreakAtRisk,
                    Title = $"Streak at risk: {habit.Name}",
                    Message = $"\"{habit.Name}\" hasn't been checked in today — {habit.Streak}-day streak at risk.",
                    EntityType = "Habit",
                    EntityId = habit.Id,
                    CreatedAt = dateTimeProvider.UtcNow,
                },
                cancellationToken
            );
            created++;
        }

        return created;
    }

    private async Task<int> GenerateGoalNotificationsAsync(CancellationToken cancellationToken)
    {
        var goals = await goalRepository.GetAllAsync(cancellationToken);
        var created = 0;

        foreach (var goal in goals)
        {
            if (goal.Status != GoalStatusType.AtRisk)
            {
                continue;
            }

            if (
                await notificationRepository.HasUnreadAsync(
                    NotificationType.GoalAtRisk,
                    goal.Id,
                    null,
                    cancellationToken
                )
            )
            {
                continue;
            }

            await notificationRepository.AddAsync(
                new Notification
                {
                    Type = NotificationType.GoalAtRisk,
                    Title = $"Goal at risk: {goal.Name}",
                    Message = $"\"{goal.Name}\" is marked At Risk ({goal.Progress}% progress).",
                    EntityType = "Goal",
                    EntityId = goal.Id,
                    CreatedAt = dateTimeProvider.UtcNow,
                },
                cancellationToken
            );
            created++;
        }

        return created;
    }

    private static NotificationResponse ToResponse(Notification notification) =>
        new(
            notification.Id,
            notification.Type,
            notification.Title,
            notification.Message,
            notification.EntityType,
            notification.EntityId,
            notification.IsRead,
            notification.CreatedAt
        );
}
