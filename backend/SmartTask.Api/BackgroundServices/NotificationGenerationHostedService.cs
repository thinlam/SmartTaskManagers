using Microsoft.EntityFrameworkCore;
using SmartTask.Application.Abstractions;
using SmartTask.Application.Notifications;
using SmartTask.Persistence;

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
                using var userListScope = scopeFactory.CreateScope();
                var dbContext = userListScope.ServiceProvider.GetRequiredService<AppDbContext>();
                var userIds = await dbContext.Users.Select(u => u.Id).ToListAsync(stoppingToken);

                var totalCount = 0;
                foreach (var userId in userIds)
                {
                    try
                    {
                        using var userScope = scopeFactory.CreateScope();
                        userScope.ServiceProvider.GetRequiredService<ICurrentUserContext>().UserId = userId;

                        var notificationService = userScope.ServiceProvider.GetRequiredService<INotificationService>();
                        totalCount += await notificationService.GenerateAsync(stoppingToken);
                    }
                    catch (Exception ex) when (ex is not OperationCanceledException)
                    {
                        // A single account's failure must not stop
                        // generation for the accounts still left in the list.
                        logger.LogError(ex, "Notification generation failed for user {UserId}.", userId);
                    }
                }

                if (totalCount > 0)
                {
                    logger.LogInformation("Notification generation created {Count} notification(s) across {UserCount} account(s).", totalCount, userIds.Count);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // A single failed run must not crash the loop — log it
                // and try again at the next interval instead.
                logger.LogError(ex, "Notification generation failed to list accounts.");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
