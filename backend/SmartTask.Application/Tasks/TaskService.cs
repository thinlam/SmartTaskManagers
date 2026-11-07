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
    private const int MaxTagCount = 10;
    private const int MaxEstimateMinutes = 10080; // 7 days — a generous but finite cap.

    public async Task<List<TaskResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var tasks = await taskRepository.GetAllAsync(cancellationToken);
        var responses = new List<TaskResponse>(tasks.Count);
        foreach (var task in tasks)
        {
            responses.Add(await ToResponseAsync(task, cancellationToken));
        }
        return responses;
    }

    public async Task<TaskResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var task = await taskRepository.GetByIdAsync(id, cancellationToken);
        return task is null ? null : await ToResponseAsync(task, cancellationToken);
    }

    public async Task<TaskResponse> CreateAsync(
        CreateTaskRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var name = request.Name.Trim();
        var errors = new Dictionary<string, List<string>>();
        ValidateName(name, errors);
        ValidateDates(request.StartDate, request.DueDate, request.DueTime, request.ReminderAt, errors);
        ValidateEstimate(request.EstimateMinutes, errors);
        ValidateTags(request.Tags, errors);
        await ValidateParentAsync(request.ParentTaskId, excludeId: null, errors, cancellationToken);
        ThrowIfInvalid(errors);

        var now = dateTimeProvider.UtcNow;
        var position = await taskRepository.CountAsync(cancellationToken);
        var task = new TaskItem
        {
            Name = name,
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
            ParentTaskId = request.ParentTaskId,
            ReminderAt = request.ReminderAt,
            AttachmentUrl = request.AttachmentUrl,
            Position = position,
            CreatedAt = now,
            UpdatedAt = now,
            LastStatusChangedAt = now,
        };

        await ApplySmartFieldsAsync(task, cancellationToken);

        await taskRepository.AddAsync(task, cancellationToken);
        await taskRepository.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(task, cancellationToken);
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

        var name = request.Name?.Trim();
        var errors = new Dictionary<string, List<string>>();
        if (name is not null)
        {
            ValidateName(name, errors);
        }
        ValidateDates(
            request.StartDate ?? task.StartDate,
            request.DueDate ?? task.DueDate,
            request.DueTime ?? task.DueTime,
            request.ReminderAt ?? task.ReminderAt,
            errors
        );
        ValidateEstimate(request.EstimateMinutes ?? task.EstimateMinutes, errors);
        ValidateTags(request.Tags ?? task.Tags, errors);
        if (request.ParentTaskId is not null && request.ParentTaskId != task.ParentTaskId)
        {
            if (request.ParentTaskId == id)
            {
                errors.AddError("ParentTaskId", "Một công việc không thể là công việc con của chính nó.");
            }
            else
            {
                await ValidateParentAsync(request.ParentTaskId, id, errors, cancellationToken);
            }
        }
        ThrowIfInvalid(errors);

        var statusChanged = request.Status is not null && request.Status.Value != task.Status;

        task.Name = name ?? task.Name;
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
        task.ParentTaskId = request.ParentTaskId ?? task.ParentTaskId;
        task.ReminderAt = request.ReminderAt ?? task.ReminderAt;
        task.AttachmentUrl = request.AttachmentUrl ?? task.AttachmentUrl;

        var now = dateTimeProvider.UtcNow;
        task.UpdatedAt = now;
        if (statusChanged)
        {
            task.LastStatusChangedAt = now;
        }

        await ApplySmartFieldsAsync(task, cancellationToken);

        await taskRepository.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(task, cancellationToken);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var task = await taskRepository.GetByIdAsync(id, cancellationToken);
        if (task is null)
        {
            return false;
        }

        task.IsDeleted = true;
        task.DeletedAt = dateTimeProvider.UtcNow;
        await taskRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<TaskResponse?> RestoreAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var task = await taskRepository.GetByIdIncludingDeletedAsync(id, cancellationToken);
        if (task is null || !task.IsDeleted)
        {
            return null;
        }

        task.IsDeleted = false;
        task.DeletedAt = null;
        task.UpdatedAt = dateTimeProvider.UtcNow;
        await taskRepository.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(task, cancellationToken);
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

        if (task.RecurringType != RecurringTypeOption.None)
        {
            await CreateNextOccurrenceAsync(task, now, cancellationToken);
        }

        await taskRepository.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(task, cancellationToken);
    }

    /// <summary>
    /// Shifts StartDate/DueDate/ReminderAt by the same delta (computed from
    /// whichever anchor date exists: DueDate, else StartDate, else today) and
    /// clones everything else — a fresh, not-yet-completed copy ready for the
    /// next cycle. "Lặp vô hạn" (GĐ1 scope): no end date/count is modeled yet,
    /// so this keeps generating one occurrence per completion indefinitely.
    /// </summary>
    private async Task CreateNextOccurrenceAsync(
        TaskItem completed,
        DateTimeOffset now,
        CancellationToken cancellationToken
    )
    {
        var anchor = completed.DueDate ?? completed.StartDate ?? DateOnly.FromDateTime(now.Date);
        var nextAnchor = ShiftDate(anchor, completed.RecurringType);
        var deltaDays = nextAnchor.DayNumber - anchor.DayNumber;

        var position = await taskRepository.CountAsync(cancellationToken);
        var next = new TaskItem
        {
            Name = completed.Name,
            Description = completed.Description,
            Area = completed.Area,
            ProjectId = completed.ProjectId,
            Category = completed.Category,
            Tags = completed.Tags,
            Priority = completed.Priority,
            Status = TaskStatusType.ToDo,
            StartDate = completed.StartDate?.AddDays(deltaDays),
            DueDate = completed.DueDate?.AddDays(deltaDays),
            DueTime = completed.DueTime,
            Progress = 0,
            EstimateMinutes = completed.EstimateMinutes,
            Energy = completed.Energy,
            Context = completed.Context,
            GoalId = completed.GoalId,
            RecurringType = completed.RecurringType,
            ParentTaskId = completed.ParentTaskId,
            ReminderAt = completed.ReminderAt?.AddDays(deltaDays),
            AttachmentUrl = completed.AttachmentUrl,
            Notes = completed.Notes,
            Position = position,
            CreatedAt = now,
            UpdatedAt = now,
            LastStatusChangedAt = now,
        };

        await ApplySmartFieldsAsync(next, cancellationToken);
        await taskRepository.AddAsync(next, cancellationToken);
    }

    private static DateOnly ShiftDate(DateOnly date, RecurringTypeOption type) =>
        type switch
        {
            RecurringTypeOption.Daily => date.AddDays(1),
            RecurringTypeOption.Weekly => date.AddDays(7),
            RecurringTypeOption.Monthly => date.AddMonths(1),
            _ => date,
        };

    private static void ValidateName(string name, Dictionary<string, List<string>> errors)
    {
        if (name.Length == 0)
        {
            errors.AddError("Name", "Tiêu đề không được để trống.");
        }
        else if (name.Length > 200)
        {
            errors.AddError("Name", "Tiêu đề tối đa 200 ký tự.");
        }
    }

    /// <summary>
    /// DueDate < StartDate is rejected (field error). A DueDate in the past
    /// is deliberately NOT validated here — spec: "cảnh báo, không chặn";
    /// the frontend already renders overdue tasks in red, so no extra
    /// warning field is needed from this endpoint.
    /// </summary>
    private static void ValidateDates(
        DateOnly? startDate,
        DateOnly? dueDate,
        TimeOnly? dueTime,
        DateTimeOffset? reminderAt,
        Dictionary<string, List<string>> errors
    )
    {
        if (startDate is not null && dueDate is not null && dueDate.Value < startDate.Value)
        {
            errors.AddError("DueDate", "Hạn hoàn thành phải sau hoặc bằng ngày bắt đầu.");
        }

        if (reminderAt is null || dueDate is null)
        {
            return;
        }

        var dueMoment = new DateTimeOffset(
            dueDate.Value.ToDateTime(dueTime ?? TimeOnly.MaxValue),
            TimeSpan.Zero
        );
        if (reminderAt.Value >= dueMoment)
        {
            errors.AddError("ReminderAt", "Thời điểm nhắc phải trước hạn hoàn thành.");
        }
    }

    private static void ValidateEstimate(int? estimateMinutes, Dictionary<string, List<string>> errors)
    {
        if (estimateMinutes is null)
        {
            return;
        }
        if (estimateMinutes <= 0)
        {
            errors.AddError("EstimateMinutes", "Thời gian ước tính phải lớn hơn 0.");
        }
        else if (estimateMinutes > MaxEstimateMinutes)
        {
            errors.AddError("EstimateMinutes", $"Thời gian ước tính tối đa {MaxEstimateMinutes} phút (7 ngày).");
        }
    }

    private static void ValidateTags(string? tags, Dictionary<string, List<string>> errors)
    {
        if (string.IsNullOrWhiteSpace(tags))
        {
            return;
        }
        var count = tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Length;
        if (count > MaxTagCount)
        {
            errors.AddError("Tags", $"Tối đa {MaxTagCount} tag.");
        }
    }

    /// <summary>Max subtask depth is 2: a top-level task may have subtasks, but a subtask may not have its own subtasks — enforced by requiring the chosen parent to itself be top-level. That structurally rules out cycles too (a subtask can never become an ancestor).</summary>
    private async Task ValidateParentAsync(
        Guid? parentTaskId,
        Guid? excludeId,
        Dictionary<string, List<string>> errors,
        CancellationToken cancellationToken
    )
    {
        if (parentTaskId is null)
        {
            return;
        }
        if (parentTaskId == excludeId)
        {
            errors.AddError("ParentTaskId", "Một công việc không thể là công việc con của chính nó.");
            return;
        }

        var parent = await taskRepository.GetByIdAsync(parentTaskId.Value, cancellationToken);
        if (parent is null)
        {
            errors.AddError("ParentTaskId", "Không tìm thấy công việc cha.");
        }
        else if (parent.ParentTaskId is not null)
        {
            errors.AddError("ParentTaskId", "Chỉ hỗ trợ tối đa 2 cấp công việc (không thể chọn một công việc con làm cha).");
        }
    }

    private static void ThrowIfInvalid(Dictionary<string, List<string>> errors)
    {
        if (errors.Count > 0)
        {
            throw new TaskValidationException(
                errors.ToDictionary(kv => kv.Key, kv => kv.Value.ToArray())
            );
        }
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

    private async Task<TaskResponse> ToResponseAsync(TaskItem task, CancellationToken cancellationToken)
    {
        var hasOpenDuplicateName = await taskRepository.ExistsOpenWithNameAsync(
            task.Name,
            task.Id,
            cancellationToken
        );
        return new TaskResponse(
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
            task.Notes,
            task.Position,
            task.ParentTaskId,
            task.ReminderAt,
            task.AttachmentUrl,
            hasOpenDuplicateName
        );
    }
}

internal static class ValidationErrorsExtensions
{
    public static void AddError(this Dictionary<string, List<string>> errors, string field, string message)
    {
        if (!errors.TryGetValue(field, out var list))
        {
            list = [];
            errors[field] = list;
        }
        list.Add(message);
    }
}
