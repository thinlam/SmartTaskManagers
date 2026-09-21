using SmartTask.Application.Abstractions;
using SmartTask.Application.Tasks;
using SmartTask.Domain.Enums;
using SmartTask.Domain.Tasks;

namespace SmartTask.Application.SmartEngine;

/// <summary>
/// Port of apps/google-sheets/src/05_SmartEngine.gs's computeSmartFields_()
/// and its helpers — every branch here should trace back to a specific
/// line there. Nothing here is random or hidden, same as the source.
/// </summary>
public sealed class SmartEngineService(ITaskRepository taskRepository, IDateTimeProvider dateTimeProvider)
    : ISmartEngineService
{
    public Task<SmartFieldsResult> ComputeAsync(TaskItem task, CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(dateTimeProvider.UtcNow.UtcDateTime);
        return ComputeInternalAsync(task, today, cancellationToken);
    }

    public async Task<int> RecalculateAllAsync(CancellationToken cancellationToken = default)
    {
        var allTasks = await taskRepository.GetAllAsync(cancellationToken);
        var today = DateOnly.FromDateTime(dateTimeProvider.UtcNow.UtcDateTime);
        var count = 0;

        foreach (var summary in allTasks)
        {
            // GetAllAsync is AsNoTracking (see TaskRepository) — re-fetch
            // each one tracked so the field writes below actually persist.
            // EF Core's identity map means this is cheap: the dependency
            // lookup inside ComputeInternalAsync for a task that also
            // appears here returns the same tracked instance, not a
            // second round-trip.
            var tracked = await taskRepository.GetByIdAsync(summary.Id, cancellationToken);
            if (tracked is null)
            {
                continue;
            }

            var fields = await ComputeInternalAsync(tracked, today, cancellationToken);
            tracked.SmartScore = fields.SmartScore;
            tracked.Risk = fields.Risk;
            tracked.RecommendedAction = fields.RecommendedAction;
            count++;
        }

        await taskRepository.SaveChangesAsync(cancellationToken);
        return count;
    }

    private async Task<SmartFieldsResult> ComputeInternalAsync(
        TaskItem task,
        DateOnly today,
        CancellationToken cancellationToken
    )
    {
        var isCompleted = task.Status == TaskStatusType.Completed;
        if (isCompleted)
        {
            return new SmartFieldsResult(0, RiskLevel.Low, "Completed");
        }

        var daysUntilDue = DaysUntil(today, task.DueDate);
        var ageDays = today.DayNumber - DateOnly.FromDateTime(task.CreatedAt.UtcDateTime).DayNumber;
        var isBlocked = task.Status == TaskStatusType.Waiting;

        var dependencyPending =
            task.DependencyTaskId is { } dependencyId
            && !await IsDependencyCompletedAsync(dependencyId, cancellationToken);

        var stalled = IsStalled(task, ageDays);

        var urgency = UrgencyScore(daysUntilDue, AppDefaults.DueSoonDays);
        var impact = SmartWeights.Impact.GetValueOrDefault(task.Priority);
        var effort = EffortFitScore(task.EstimateMinutes);
        var goalAlign = task.GoalId is not null ? SmartWeights.GoalAlignment : 0;
        var age = Math.Min(ageDays / 2 * SmartWeights.TaskAgePerTwoDays, SmartWeights.TaskAgeCap);

        var smartScore = Math.Clamp(urgency + impact + effort + goalAlign + age, 0, 100);

        var riskPoints = 0;
        if (daysUntilDue is { } d)
        {
            if (d < 0)
                riskPoints += SmartWeights.Risk.Overdue;
            else if (d == 0)
                riskPoints += SmartWeights.Risk.DueToday;
            else if (d <= AppDefaults.DueSoonDays)
                riskPoints += SmartWeights.Risk.DueSoon;
        }
        if (isBlocked)
            riskPoints += SmartWeights.Risk.Blocked;
        if (dependencyPending)
            riskPoints += SmartWeights.Risk.DependencyPending;
        if (stalled)
            riskPoints += SmartWeights.Risk.Stalled;
        if (task.Priority == PriorityLevel.Critical)
            riskPoints += SmartWeights.Risk.CriticalPriority;

        var risk = RiskBucket(riskPoints);

        var action = RecommendAction(
            new ActionContext(
                IsBlocked: isBlocked,
                DependencyPending: dependencyPending,
                Stalled: stalled,
                DaysUntilDue: daysUntilDue,
                DueSoonDays: AppDefaults.DueSoonDays,
                EstimateMinutes: task.EstimateMinutes ?? 0,
                SmartScore: smartScore
            )
        );

        return new SmartFieldsResult(smartScore, risk, action);
    }

    private async Task<bool> IsDependencyCompletedAsync(Guid dependencyTaskId, CancellationToken cancellationToken)
    {
        var dependency = await taskRepository.GetByIdAsync(dependencyTaskId, cancellationToken);
        // Matches isDependencyCompleted_(): a dependency that no longer
        // exists is treated as satisfied, not as permanently blocking.
        return dependency is null || dependency.Status == TaskStatusType.Completed;
    }

    private static bool IsStalled(TaskItem task, int ageDays) =>
        ageDays >= 5
        && task.Progress < 20
        && task.Status != TaskStatusType.Inbox
        && task.Status != TaskStatusType.Completed;

    private static RiskLevel RiskBucket(int points)
    {
        if (points >= SmartWeights.RiskBucketCritical)
            return RiskLevel.Critical;
        if (points >= SmartWeights.RiskBucketHigh)
            return RiskLevel.High;
        if (points >= SmartWeights.RiskBucketMedium)
            return RiskLevel.Medium;
        return RiskLevel.Low;
    }

    private static int UrgencyScore(int? daysUntilDue, int dueSoonDays)
    {
        if (daysUntilDue is not { } d)
            return SmartWeights.Urgency.Later;
        if (d < 0)
            return SmartWeights.Urgency.Overdue;
        if (d == 0)
            return SmartWeights.Urgency.DueToday;
        if (d <= dueSoonDays)
            return SmartWeights.Urgency.DueSoon;
        if (d <= 7)
            return SmartWeights.Urgency.DueThisWeek;
        return SmartWeights.Urgency.Later;
    }

    private static int EffortFitScore(int? estimateMinutes)
    {
        var m = estimateMinutes ?? 0;
        if (m <= 0)
            return SmartWeights.EffortFit.Medium;
        if (m <= 15)
            return SmartWeights.EffortFit.Tiny;
        if (m <= 30)
            return SmartWeights.EffortFit.Small;
        if (m <= 60)
            return SmartWeights.EffortFit.Medium;
        if (m <= 120)
            return SmartWeights.EffortFit.Large;
        return SmartWeights.EffortFit.Xlarge;
    }

    private static string RecommendAction(ActionContext ctx)
    {
        if (ctx.IsBlocked)
            return "Review blocked task";
        if (ctx.DependencyPending)
            return "Waiting for dependency";
        if (ctx.DaysUntilDue is { } overdueCheck && overdueCheck < 0)
            return "Overdue - do now";
        if (ctx.DaysUntilDue == 0)
            return ctx.EstimateMinutes > 90 ? "Break down" : "Do now";
        if (ctx.Stalled)
            return "Break down";
        if (ctx.SmartScore >= 85)
            return "Do now";
        if (ctx.EstimateMinutes is > 0 and <= 15)
            return "Quick win";
        if (ctx.DaysUntilDue is { } dueSoonCheck && dueSoonCheck <= ctx.DueSoonDays)
            return "Schedule";
        return "Defer";
    }

    /// <summary>DueDate - today, in days. Null when there's no due date (matches daysBetween_'s null-propagation).</summary>
    private static int? DaysUntil(DateOnly today, DateOnly? dueDate) =>
        dueDate is { } d ? d.DayNumber - today.DayNumber : null;

    private readonly record struct ActionContext(
        bool IsBlocked,
        bool DependencyPending,
        bool Stalled,
        int? DaysUntilDue,
        int DueSoonDays,
        int EstimateMinutes,
        int SmartScore
    );
}
