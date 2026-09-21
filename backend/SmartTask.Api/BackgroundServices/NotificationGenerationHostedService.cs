using SmartTask.Application.Notifications;

namespace SmartTask.Api.BackgroundServices;

/// <summary>
/// Phase 30 — periodically runs NotificationService.GenerateAsync so
/// task-overdue/due-soon, habit-streak-at-risk and goal-at-risk
/// notifications appear without anyone having to call
/// POST /api/notifications/generate by hand. 30 minutes is frequent
/// enough to feel current without generating pointless load — there's no
/// value in checking more often, since these conditions only change as
/// the calendar advances or another request updates a Task/Habit/Goal.
/// </summary>
public sealed class NotificationGenerationHostedService(
    IServiceScopeFactory scopeFactory,
    ILogger<NotificationGenerationHostedService> logger
) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);

        do
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
                var count = await notificationService.GenerateAsync(stoppingToken);
                if (count > 0)
                {
                    logger.LogInformation("Notification generation created {Count} notification(s).", count);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // A single failed run must not crash the loop — log it
                // and try again at the next interval instead.
                logger.LogError(ex, "Notification generation failed.");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
