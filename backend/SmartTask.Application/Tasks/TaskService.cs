using SmartTask.Application.Abstractions;
using SmartTask.Application.SmartEngine;
using SmartTask.Domain.Enums;
using SmartTask.Domain.Tasks;

namespace SmartTask.Application.Tasks;

/// <summary>
/// The use case — orchestrates through ITaskRepository/IDateTimeProvider
/// only, same pattern as Phase 22's AuthService. First real CRUD slice
/// on top of Phase 21's schema.
/// </summary>
public sealed class TaskService(
    ITaskRepository taskRepository,
    IDateTimeProvider dateTimeProvider,
    ISmartEngineService smartEngineService
) : ITaskService
{
    public async Task<List<TaskResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var tasks = await taskRepository.GetAllAsync(cancellationToken);
        return tasks.Select(ToResponse).ToList();
    }

    public async Task<TaskResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var task = await taskRepository.GetByIdAsync(id, cancellationToken);
        return task is null ? null : ToResponse(task);
    }

    public async Task<TaskResponse> CreateAsync(
        CreateTaskRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var now = dateTimeProvider.UtcNow;
        var task = new TaskItem
        {
            Name = request.Name,
            Description = request.Description,
            Area = request.Area,
            ProjectId = request.ProjectId,
            Category = request.Category,
            Tags = request.Tags,
            Priority = request.Priority,
            Status = request.Status,
            StartDate = request.StartDate,
            DueDate = request.DueDate,
            DueTime = request.DueTime,
            Progress = request.Progress,
            EstimateMinutes = request.EstimateMinutes,
            Energy = request.Energy,
            Context = request.Context,
            GoalId = request.GoalId,
            RecurringType = request.RecurringType,
            DependencyTaskId = request.DependencyTaskId,
            Notes = request.Notes,
            CreatedAt = now,
            UpdatedAt = now,
            LastStatusChangedAt = now,
        };

        await ApplySmartFieldsAsync(task, cancellationToken);

        await taskRepository.AddAsync(task, cancellationToken);
        await taskRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(task);
    }

    public async Task<TaskResponse?> UpdateAsync(
        Guid id,
        UpdateTaskRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var task = await taskRepository.GetByIdAsync(id, cancellationToken);
        if (task is null)
        {
            return null;
        }

        var statusChanged = request.Status is not null && request.Status.Value != task.Status;

        task.Name = request.Name ?? task.Name;
        task.Description = request.Description ?? task.Description;
        task.Area = request.Area ?? task.Area;
        task.ProjectId = request.ProjectId ?? task.ProjectId;
        task.Category = request.Category ?? task.Category;
        task.Tags = request.Tags ?? task.Tags;
        task.Priority = request.Priority ?? task.Priority;
        task.Status = request.Status ?? task.Status;
        task.StartDate = request.StartDate ?? task.StartDate;
        task.DueDate = request.DueDate ?? task.DueDate;
        task.DueTime = request.DueTime ?? task.DueTime;
        task.Progress = request.Progress ?? task.Progress;
        task.EstimateMinutes = request.EstimateMinutes ?? task.EstimateMinutes;
        task.Energy = request.Energy ?? task.Energy;
        task.Context = request.Context ?? task.Context;
        task.GoalId = request.GoalId ?? task.GoalId;
        task.RecurringType = request.RecurringType ?? task.RecurringType;
        task.DependencyTaskId = request.DependencyTaskId ?? task.DependencyTaskId;
        task.Notes = request.Notes ?? task.Notes;

        var now = dateTimeProvider.UtcNow;
        task.UpdatedAt = now;
        if (statusChanged)
        {
            task.LastStatusChangedAt = now;
        }

        await ApplySmartFieldsAsync(task, cancellationToken);

        await taskRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(task);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var task = await taskRepository.GetByIdAsync(id, cancellationToken);
        if (task is null)
        {
            return false;
        }

        taskRepository.Remove(task);
        await taskRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<TaskResponse?> CompleteAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var task = await taskRepository.GetByIdAsync(id, cancellationToken);
        if (task is null)
        {
            return null;
        }

        var now = dateTimeProvider.UtcNow;
        task.Status = TaskStatusType.Completed;
        task.Progress = 100;
        task.CompletedDate = now;
        task.UpdatedAt = now;
        task.LastStatusChangedAt = now;

        await ApplySmartFieldsAsync(task, cancellationToken);

        await taskRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(task);
    }

    /// <summary>
    /// Matches computeSmartFields_() being called on every create/update
    /// in apps/google-sheets/src/03_Data.gs — SmartScore/Risk/
    /// RecommendedAction are never allowed to go stale between edits.
    /// </summary>
    private async Task ApplySmartFieldsAsync(TaskItem task, CancellationToken cancellationToken)
    {
        var fields = await smartEngineService.ComputeAsync(task, cancellationToken);
        task.SmartScore = fields.SmartScore;
        task.Risk = fields.Risk;
        task.RecommendedAction = fields.RecommendedAction;
    }

    private static TaskResponse ToResponse(TaskItem task) =>
        new(
            task.Id,
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
            task.SmartScore,
            task.Risk,
            task.RecommendedAction,
            task.CreatedAt,
            task.UpdatedAt,
            task.LastStatusChangedAt,
            task.Notes
        );
}
