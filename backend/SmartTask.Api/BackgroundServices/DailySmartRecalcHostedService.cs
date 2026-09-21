using SmartTask.Application.SmartEngine;

namespace SmartTask.Api.BackgroundServices;

/// <summary>
/// Port of apps/google-sheets/src/05_SmartEngine.gs's
/// ensureDailyRecalcTrigger_() — Sheets refreshes every task's
/// SmartScore/Risk/RecommendedAction once a day at 06:00 because urgency
/// shifts with the calendar even when nobody edits a task (a task "due in
/// 3 days" silently becomes "due today"). A BackgroundService is the
/// ASP.NET Core equivalent of that time-driven Apps Script trigger — no
/// separate scheduler/cron infra exists in this project, so this is
/// deliberately just an in-process loop, not a distributed job.
/// </summary>
public sealed class DailySmartRecalcHostedService(
    IServiceScopeFactory scopeFactory,
    ILogger<DailySmartRecalcHostedService> logger
) : BackgroundService
{
    private static readonly TimeSpan RunAtUtc = TimeSpan.FromHours(6);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = TimeUntilNextRun(DateTimeOffset.UtcNow);
            try
            {
                await Task.Delay(delay, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }

            try
            {
                using var scope = scopeFactory.CreateScope();
                var smartEngineService = scope.ServiceProvider.GetRequiredService<ISmartEngineService>();
                var count = await smartEngineService.RecalculateAllAsync(stoppingToken);
                logger.LogInformation("Daily Smart Engine recalculation updated {Count} task(s).", count);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // A single failed run (e.g. a transient DB hiccup) must
                // not crash the hosted service loop — log it and try
                // again at the next scheduled time instead.
                logger.LogError(ex, "Daily Smart Engine recalculation failed.");
            }
        }
    }

    internal static TimeSpan TimeUntilNextRun(DateTimeOffset now)
    {
        var todayRun = new DateTimeOffset(now.Year, now.Month, now.Day, 0, 0, 0, TimeSpan.Zero) + RunAtUtc;
        var nextRun = now < todayRun ? todayRun : todayRun.AddDays(1);
        return nextRun - now;
    }
}
