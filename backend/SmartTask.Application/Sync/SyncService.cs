using SmartTask.Application.Abstractions;
using SmartTask.Application.Goals;
using SmartTask.Application.Habits;
using SmartTask.Application.Projects;
using SmartTask.Application.Tasks;
using SmartTask.Domain.Common;
using SmartTask.Domain.Goals;
using SmartTask.Domain.Habits;
using SmartTask.Domain.Projects;
using SmartTask.Domain.Tasks;

namespace SmartTask.Application.Sync;

/// <summary>
/// Each entity type is processed independently and each item gets its own
/// SaveChangesAsync — slower than one batched save, but means one bad
/// item (e.g. a Tags value too long, an invalid ProjectId FK) reports
/// Error for that item alone instead of rolling back everyone else's
/// otherwise-valid sync in the same push. Matches the requirement that a
/// backend-side failure must never cost Sheets data that was in fact
/// valid.
/// </summary>
public sealed class SyncService(
    ITaskRepository taskRepository,
    IProjectRepository projectRepository,
    IGoalRepository goalRepository,
    IHabitRepository habitRepository,
    IDateTimeProvider dateTimeProvider
) : ISyncService
{
    public async Task<SyncPushResponse> PushAsync(
        SyncPushRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var taskResults = new List<SyncPushItemResult>();
        foreach (var item in request.Tasks)
        {
            taskResults.Add(await PushTaskAsync(item, cancellationToken));
        }

        var projectResults = new List<SyncPushItemResult>();
        foreach (var item in request.Projects)
        {
            projectResults.Add(await PushProjectAsync(item, cancellationToken));
        }

        var goalResults = new List<SyncPushItemResult>();
        foreach (var item in request.Goals)
        {
            goalResults.Add(await PushGoalAsync(item, cancellationToken));
        }

        var habitResults = new List<SyncPushItemResult>();
        foreach (var item in request.Habits)
        {
            habitResults.Add(await PushHabitAsync(item, cancellationToken));
        }

        return new SyncPushResponse(taskResults, projectResults, goalResults, habitResults);
    }

    public async Task<SyncPullResponse> PullAsync(
        DateTimeOffset since,
        CancellationToken cancellationToken = default
    )
    {
        var now = dateTimeProvider.UtcNow;

        var tasks = await taskRepository.GetChangedSinceAsync(since, cancellationToken);
        var projects = await projectRepository.GetChangedSinceAsync(since, cancellationToken);
        var goals = await goalRepository.GetChangedSinceAsync(since, cancellationToken);
        var habits = await habitRepository.GetChangedSinceAsync(since, cancellationToken);

        return new SyncPullResponse(
            now,
            tasks.Select(ToSyncResponse).ToList(),
            projects.Select(ToSyncResponse).ToList(),
            goals.Select(ToSyncResponse).ToList(),
            habits.Select(ToSyncResponse).ToList()
        );
    }

    /* ======================================================================
     * TASKS
     * ==================================================================== */

    private async Task<SyncPushItemResult> PushTaskAsync(
        SyncTaskItem item,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var existing =
                item.Id is { } taskId
                    ? await taskRepository.GetByIdAsync(taskId, cancellationToken)
                    : null;
            existing ??= await taskRepository.GetByExternalIdAsync(item.ExternalId, cancellationToken);

            if (existing is null)
            {
                var now = dateTimeProvider.UtcNow;
                var task = new TaskItem
                {
                    ExternalId = item.ExternalId,
                    Name = item.Name,
                    Description = item.Description,
                    Area = item.Area,
                    ProjectId = item.ProjectId,
                    Category = item.Category,
                    Tags = item.Tags,
                    Priority = item.Priority,
                    Status = item.Status,
                    StartDate = item.StartDate,
                    DueDate = item.DueDate,
                    DueTime = item.DueTime,
                    CompletedDate = item.CompletedDate,
                    Progress = item.Progress,
                    EstimateMinutes = item.EstimateMinutes,
                    Energy = item.Energy,
                    Context = item.Context,
                    GoalId = item.GoalId,
                    RecurringType = item.RecurringType,
                    DependencyTaskId = item.DependencyTaskId,
                    Notes = item.Notes,
                    CreatedAt = item.UpdatedAt,
                    UpdatedAt = item.UpdatedAt,
                    SyncStatus = SyncStatus.Synced,
                    LastSyncedAt = now,
                    Version = 1,
                };
                await taskRepository.AddAsync(task, cancellationToken);
                await taskRepository.SaveChangesAsync(cancellationToken);
                return Result(item.ExternalId, task.Id, SyncItemOutcome.Created, task);
            }

            if (item.UpdatedAt < existing.UpdatedAt)
            {
                return Result(item.ExternalId, existing.Id, SyncItemOutcome.SkippedOlder, existing);
            }

            existing.ExternalId = item.ExternalId;
            existing.Name = item.Name;
            existing.Description = item.Description;
            existing.Area = item.Area;
            existing.ProjectId = item.ProjectId;
            existing.Category = item.Category;
            existing.Tags = item.Tags;
            existing.Priority = item.Priority;
            existing.Status = item.Status;
            existing.StartDate = item.StartDate;
            existing.DueDate = item.DueDate;
            existing.DueTime = item.DueTime;
            existing.CompletedDate = item.CompletedDate;
            existing.Progress = item.Progress;
            existing.EstimateMinutes = item.EstimateMinutes;
            existing.Energy = item.Energy;
            existing.Context = item.Context;
            existing.GoalId = item.GoalId;
            existing.RecurringType = item.RecurringType;
            existing.DependencyTaskId = item.DependencyTaskId;
            existing.Notes = item.Notes;
            existing.UpdatedAt = item.UpdatedAt;
            existing.Version += 1;
            existing.SyncStatus = SyncStatus.Synced;
            existing.LastSyncedAt = dateTimeProvider.UtcNow;

            await taskRepository.SaveChangesAsync(cancellationToken);
            return Result(item.ExternalId, existing.Id, SyncItemOutcome.Updated, existing);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            taskRepository.DiscardTracking();
            return new SyncPushItemResult(
                item.ExternalId,
                null,
                SyncItemOutcome.Error,
                null,
                null,
                "Invalid ProjectId, GoalId, or DependencyTaskId reference: " + ex.Message
            );
        }
    }

    private static SyncPushItemResult Result(
        string externalId,
        Guid id,
        SyncItemOutcome outcome,
        TaskItem task
    ) => new(externalId, id, outcome, task.UpdatedAt, task.Version, null);

    private static SyncPushItemResult Result(
        string externalId,
        Guid id,
        SyncItemOutcome outcome,
        Project project
    ) => new(externalId, id, outcome, project.UpdatedAt, project.Version, null);

    private static SyncPushItemResult Result(
        string externalId,
        Guid id,
        SyncItemOutcome outcome,
        Goal goal
    ) => new(externalId, id, outcome, goal.UpdatedAt, goal.Version, null);

    private static SyncPushItemResult Result(
        string externalId,
        Guid id,
        SyncItemOutcome outcome,
        Habit habit
    ) => new(externalId, id, outcome, habit.UpdatedAt, habit.Version, null);

    private static SyncTaskResponse ToSyncResponse(TaskItem task) =>
        new(
            task.Id,
            task.ExternalId,
            task.Name,
            task.Description,
            task.Area,
            task.ProjectId,
            task.Category,
            task.Tags,
            task.Priority,
            task.Status,
            task.StartDate,
            task.DueDate,
            task.DueTime,
            task.CompletedDate,
            task.Progress,
            task.EstimateMinutes,
            task.Energy,
            task.Context,
            task.GoalId,
            task.RecurringType,
            task.DependencyTaskId,
            task.Notes,
            task.UpdatedAt,
            task.Version
        );

    /* ======================================================================
     * PROJECTS
     * ==================================================================== */

    private async Task<SyncPushItemResult> PushProjectAsync(
        SyncProjectItem item,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var existing =
                item.Id is { } projectId
                    ? await projectRepository.GetByIdAsync(projectId, cancellationToken)
                    : null;
            existing ??= await projectRepository.GetByExternalIdAsync(
                item.ExternalId,
                cancellationToken
            );

            if (existing is null)
            {
                var now = dateTimeProvider.UtcNow;
                var project = new Project
                {
                    ExternalId = item.ExternalId,
                    Name = item.Name,
                    Area = item.Area,
                    TargetDate = item.TargetDate,
                    Description = item.Description,
                    CreatedAt = item.UpdatedAt,
                    UpdatedAt = item.UpdatedAt,
                    SyncStatus = SyncStatus.Synced,
                    LastSyncedAt = now,
                    Version = 1,
                };
                await projectRepository.AddAsync(project, cancellationToken);
                await projectRepository.SaveChangesAsync(cancellationToken);
                return Result(item.ExternalId, project.Id, SyncItemOutcome.Created, project);
            }

            if (item.UpdatedAt < existing.UpdatedAt)
            {
                return Result(item.ExternalId, existing.Id, SyncItemOutcome.SkippedOlder, existing);
            }

            existing.ExternalId = item.ExternalId;
            existing.Name = item.Name;
            existing.Area = item.Area;
            existing.TargetDate = item.TargetDate;
            existing.Description = item.Description;
            existing.UpdatedAt = item.UpdatedAt;
            existing.Version += 1;
            existing.SyncStatus = SyncStatus.Synced;
            existing.LastSyncedAt = dateTimeProvider.UtcNow;

            await projectRepository.SaveChangesAsync(cancellationToken);
            return Result(item.ExternalId, existing.Id, SyncItemOutcome.Updated, existing);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            projectRepository.DiscardTracking();
            return new SyncPushItemResult(
                item.ExternalId,
                null,
                SyncItemOutcome.Error,
                null,
                null,
                ex.Message
            );
        }
    }

    private static SyncProjectResponse ToSyncResponse(Project project) =>
        new(
            project.Id,
            project.ExternalId,
            project.Name,
            project.Area,
            project.Health,
            project.TargetDate,
            project.Description,
            project.UpdatedAt,
            project.Version
        );

    /* ======================================================================
     * GOALS
     * ==================================================================== */

    private async Task<SyncPushItemResult> PushGoalAsync(
        SyncGoalItem item,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var existing =
                item.Id is { } goalId
                    ? await goalRepository.GetByIdAsync(goalId, cancellationToken)
                    : null;
            existing ??= await goalRepository.GetByExternalIdAsync(item.ExternalId, cancellationToken);

            if (existing is null)
            {
                var now = dateTimeProvider.UtcNow;
                var goal = new Goal
                {
                    ExternalId = item.ExternalId,
                    Name = item.Name,
                    Area = item.Area,
                    TargetDate = item.TargetDate,
                    Progress = item.Progress,
                    Status = item.Status,
                    CreatedAt = item.UpdatedAt,
                    UpdatedAt = item.UpdatedAt,
                    SyncStatus = SyncStatus.Synced,
                    LastSyncedAt = now,
                    Version = 1,
                };
                await goalRepository.AddAsync(goal, cancellationToken);
                await goalRepository.SaveChangesAsync(cancellationToken);
                return Result(item.ExternalId, goal.Id, SyncItemOutcome.Created, goal);
            }

            if (item.UpdatedAt < existing.UpdatedAt)
            {
                return Result(item.ExternalId, existing.Id, SyncItemOutcome.SkippedOlder, existing);
            }

            existing.ExternalId = item.ExternalId;
            existing.Name = item.Name;
            existing.Area = item.Area;
            existing.TargetDate = item.TargetDate;
            existing.Progress = item.Progress;
            existing.Status = item.Status;
            existing.UpdatedAt = item.UpdatedAt;
            existing.Version += 1;
            existing.SyncStatus = SyncStatus.Synced;
            existing.LastSyncedAt = dateTimeProvider.UtcNow;

            await goalRepository.SaveChangesAsync(cancellationToken);
            return Result(item.ExternalId, existing.Id, SyncItemOutcome.Updated, existing);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            goalRepository.DiscardTracking();
            return new SyncPushItemResult(
                item.ExternalId,
                null,
                SyncItemOutcome.Error,
                null,
                null,
                ex.Message
            );
        }
    }

    private static SyncGoalResponse ToSyncResponse(Goal goal) =>
        new(
            goal.Id,
            goal.ExternalId,
            goal.Name,
            goal.Area,
            goal.TargetDate,
            goal.Progress,
            goal.Status,
            goal.UpdatedAt,
            goal.Version
        );

    /* ======================================================================
     * HABITS
     * ==================================================================== */

    private async Task<SyncPushItemResult> PushHabitAsync(
        SyncHabitItem item,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var existing =
                item.Id is { } habitId
                    ? await habitRepository.GetByIdAsync(habitId, cancellationToken)
                    : null;
            existing ??= await habitRepository.GetByExternalIdAsync(
                item.ExternalId,
                cancellationToken
            );

            if (existing is null)
            {
                var now = dateTimeProvider.UtcNow;
                var habit = new Habit
                {
                    ExternalId = item.ExternalId,
                    Name = item.Name,
                    Frequency = item.Frequency,
                    Streak = item.Streak,
                    TargetCount = item.TargetCount,
                    CompletedCount = item.CompletedCount,
                    LastCompletedDate = item.LastCompletedDate,
                    CreatedAt = item.UpdatedAt,
                    UpdatedAt = item.UpdatedAt,
                    SyncStatus = SyncStatus.Synced,
                    LastSyncedAt = now,
                    Version = 1,
                };
                await habitRepository.AddAsync(habit, cancellationToken);
                await habitRepository.SaveChangesAsync(cancellationToken);
                return Result(item.ExternalId, habit.Id, SyncItemOutcome.Created, habit);
            }

            if (item.UpdatedAt < existing.UpdatedAt)
            {
                return Result(item.ExternalId, existing.Id, SyncItemOutcome.SkippedOlder, existing);
            }

            existing.ExternalId = item.ExternalId;
            existing.Name = item.Name;
            existing.Frequency = item.Frequency;
            existing.Streak = item.Streak;
            existing.TargetCount = item.TargetCount;
            existing.CompletedCount = item.CompletedCount;
            existing.LastCompletedDate = item.LastCompletedDate;
            existing.UpdatedAt = item.UpdatedAt;
            existing.Version += 1;
            existing.SyncStatus = SyncStatus.Synced;
            existing.LastSyncedAt = dateTimeProvider.UtcNow;

            await habitRepository.SaveChangesAsync(cancellationToken);
            return Result(item.ExternalId, existing.Id, SyncItemOutcome.Updated, existing);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            habitRepository.DiscardTracking();
            return new SyncPushItemResult(
                item.ExternalId,
                null,
                SyncItemOutcome.Error,
                null,
                null,
                ex.Message
            );
        }
    }

    private static SyncHabitResponse ToSyncResponse(Habit habit) =>
        new(
            habit.Id,
            habit.ExternalId,
            habit.Name,
            habit.Frequency,
            habit.Streak,
            habit.TargetCount,
            habit.CompletedCount,
            habit.LastCompletedDate,
            habit.UpdatedAt,
            habit.Version
        );
}
