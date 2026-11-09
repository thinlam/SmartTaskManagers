using SmartTask.Application.Abstractions;
using SmartTask.Application.SmartEngine;
using SmartTask.Application.Tags;
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
    ITagRepository tagRepository,
    ITaskAreaRepository areaRepository,
    IDateTimeProvider dateTimeProvider,
    ISmartEngineService smartEngineService
) : ITaskService
{
    private const int MaxTagCount = 10;
    private const int MaxTagLength = 30;
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
        await ValidateAreaAsync(request.AreaId, errors, cancellationToken);
        ThrowIfInvalid(errors);

        var tags = await tagRepository.GetOrCreateManyAsync(request.Tags ?? [], cancellationToken);

        var now = dateTimeProvider.UtcNow;
        var position = await taskRepository.CountAsync(cancellationToken);
#pragma warning disable CS0618 // Area (legacy enum) still written for back-compat read paths; AreaId is the live value.
        var task = new TaskItem
        {
            Name = name,
            Description = request.Description,
            Area = request.Area,
            AreaId = request.AreaId,
            ProjectId = request.ProjectId,
            Category = request.Category,
            Tags = tags,
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
#pragma warning restore CS0618

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
        ValidateTags(request.Tags, errors);
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
        await ValidateAreaAsync(request.AreaId, errors, cancellationToken);
        ThrowIfInvalid(errors);

        var previousStatus = task.Status;
        var previousProgress = task.Progress;

        task.Name = name ?? task.Name;
        task.Description = request.Description ?? task.Description;
#pragma warning disable CS0618 // Area (legacy enum) still written for back-compat read paths; AreaId is the live value.
        task.Area = request.Area ?? task.Area;
#pragma warning restore CS0618
        task.AreaId = request.AreaId ?? task.AreaId;
        task.ProjectId = request.ProjectId ?? task.ProjectId;
        task.Category = request.Category ?? task.Category;
        if (request.Tags is not null)
        {
            task.Tags = await tagRepository.GetOrCreateManyAsync(request.Tags, cancellationToken);
        }
        task.Priority = request.Priority ?? task.Priority;
        task.DueTime = request.DueTime ?? task.DueTime;
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
        task.StartDate = request.StartDate ?? task.StartDate;
        task.DueDate = request.DueDate ?? task.DueDate;

        var now = dateTimeProvider.UtcNow;

        // Progress/Status đồng bộ 2 chiều (quy tắc nghiệp vụ, 2026-11-09):
        // Progress=100 -> Hoàn thành; Progress>0 từ Hộp thư đến/Cần làm -> Đang thực hiện;
        // Progress rớt dưới 100 khi đang Hoàn thành -> tự mở lại.
        var targetStatus = request.Status ?? previousStatus;
        if (request.Status is null && request.Progress is not null)
        {
            if (request.Progress.Value == 100)
            {
                targetStatus = TaskStatusType.Completed;
            }
            else if (previousStatus == TaskStatusType.Completed)
            {
                targetStatus = TaskStatusType.InProgress;
            }
            else if (
                request.Progress.Value > 0
                && (previousStatus == TaskStatusType.Inbox || previousStatus == TaskStatusType.ToDo)
            )
            {
                targetStatus = TaskStatusType.InProgress;
            }
        }

        var completingNow = targetStatus == TaskStatusType.Completed && previousStatus != TaskStatusType.Completed;
        var reopeningNow = targetStatus != TaskStatusType.Completed && previousStatus == TaskStatusType.Completed;

        if (completingNow)
        {
            await CompleteCoreAsync(task, request.ConfirmCompleteSubtasks, previousProgress, now, cancellationToken);
        }
        else if (reopeningNow)
        {
            task.Status = targetStatus;
            task.Progress = request.Progress ?? task.ProgressBeforeComplete ?? 0;
            task.ProgressBeforeComplete = null;
            task.CompletedDate = null;
        }
        else
        {
            task.Status = targetStatus;
            task.Progress = request.Progress ?? task.Progress;
        }

        if (targetStatus == TaskStatusType.InProgress && task.StartDate is null)
        {
            task.StartDate = DateOnly.FromDateTime(now.Date);
        }

        task.UpdatedAt = now;
        if (targetStatus != previousStatus)
        {
            task.LastStatusChangedAt = now;
            taskRepository.AddActivityLog(
                new TaskActivityLog
                {
                    TaskId = task.Id,
                    Action = "status_changed",
                    OldValue = previousStatus.ToString(),
                    NewValue = targetStatus.ToString(),
                    At = now,
                }
            );
        }
        task.Version++;

        await ApplySmartFieldsAsync(task, cancellationToken);

        await taskRepository.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(task, cancellationToken);
    }

    /// <summary>
    /// Shared completion side effects for both UpdateAsync (Status/Progress driving a transition
    /// into Completed) and CompleteAsync (the dedicated "quick complete" endpoint): records
    /// ProgressBeforeComplete for later reopen, cancels an unfired reminder, completes incomplete
    /// subtasks when confirmed (or throws TaskActionRequiresConfirmationException otherwise), and
    /// creates the next occurrence for a recurring task. Does not save — callers call
    /// SaveChangesAsync once after this returns.
    /// </summary>
    private async Task CompleteCoreAsync(
        TaskItem task,
        bool confirmCompleteSubtasks,
        int progressBeforeComplete,
        DateTimeOffset now,
        CancellationToken cancellationToken
    )
    {
        var subtasks = await taskRepository.GetSubtasksAsync(task.Id, cancellationToken);
        var incomplete = subtasks.Where(s => s.Status != TaskStatusType.Completed).ToList();
        if (incomplete.Count > 0 && !confirmCompleteSubtasks)
        {
            throw new TaskActionRequiresConfirmationException(
                "complete",
                $"Công việc này còn {incomplete.Count} việc con chưa hoàn thành. Hoàn thành luôn các việc con?",
                incomplete.Select(s => s.Id).ToList()
            );
        }

        task.Status = TaskStatusType.Completed;
        task.ProgressBeforeComplete = progressBeforeComplete;
        task.Progress = 100;
        task.CompletedDate = now;
        if (task.ReminderAt is not null && task.ReminderAt > now)
        {
            task.ReminderAt = null;
        }

        foreach (var subtask in incomplete)
        {
            subtask.ProgressBeforeComplete = subtask.Progress;
            subtask.Status = TaskStatusType.Completed;
            subtask.Progress = 100;
            subtask.CompletedDate = now;
            subtask.UpdatedAt = now;
            subtask.LastStatusChangedAt = now;
            subtask.Version++;
        }

        if (task.RecurringType != RecurringTypeOption.None)
        {
            await CreateNextOccurrenceAsync(task, now, cancellationToken);
        }
    }

    public async Task<bool> DeleteAsync(
        Guid id,
        bool? cascadeSubtasks = null,
        CancellationToken cancellationToken = default
    )
    {
        var task = await taskRepository.GetByIdAsync(id, cancellationToken);
        if (task is null)
        {
            return false;
        }

        var subtasks = await taskRepository.GetSubtasksAsync(id, cancellationToken);
        if (subtasks.Count > 0 && cascadeSubtasks is null)
        {
            throw new TaskActionRequiresConfirmationException(
                "delete",
                $"Công việc này có {subtasks.Count} việc con. Xóa luôn việc con hay chuyển lên cấp trên?",
                subtasks.Select(s => s.Id).ToList()
            );
        }

        var now = dateTimeProvider.UtcNow;
        foreach (var subtask in subtasks)
        {
            if (cascadeSubtasks == true)
            {
                subtask.IsDeleted = true;
                subtask.DeletedAt = now;
            }
            else
            {
                subtask.ParentTaskId = null;
            }
            subtask.UpdatedAt = now;
            subtask.Version++;
        }

        task.IsDeleted = true;
        task.DeletedAt = now;
        task.Version++;
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
        task.Version++;
        await taskRepository.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(task, cancellationToken);
    }

    public async Task<TaskResponse?> CompleteAsync(
        Guid id,
        bool confirmCompleteSubtasks = false,
        CancellationToken cancellationToken = default
    )
    {
        var task = await taskRepository.GetByIdAsync(id, cancellationToken);
        if (task is null)
        {
            return null;
        }

        if (task.Status == TaskStatusType.Completed)
        {
            return await ToResponseAsync(task, cancellationToken);
        }

        var now = dateTimeProvider.UtcNow;
        var previousStatus = task.Status;
        var previousProgress = task.Progress;
        await CompleteCoreAsync(task, confirmCompleteSubtasks, previousProgress, now, cancellationToken);

        task.UpdatedAt = now;
        task.LastStatusChangedAt = now;
        task.Version++;
        taskRepository.AddActivityLog(
            new TaskActivityLog
            {
                TaskId = task.Id,
                Action = "status_changed",
                OldValue = previousStatus.ToString(),
                NewValue = TaskStatusType.Completed.ToString(),
                At = now,
            }
        );

        await ApplySmartFieldsAsync(task, cancellationToken);

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
#pragma warning disable CS0618 // Area (legacy enum) still copied for back-compat read paths; AreaId is the live value.
        var next = new TaskItem
        {
            Name = completed.Name,
            Description = completed.Description,
            Area = completed.Area,
            AreaId = completed.AreaId,
            ProjectId = completed.ProjectId,
            Category = completed.Category,
            Tags = completed.Tags.ToList(),
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
#pragma warning restore CS0618

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

    private static void ValidateTags(List<string>? tags, Dictionary<string, List<string>> errors)
    {
        if (tags is null || tags.Count == 0)
        {
            return;
        }

        // Count distinct normalized names, not raw entries — "Work" and "work" collapse to
        // one tag once resolved (see ITagRepository.GetOrCreateManyAsync), so the limit should
        // match what actually gets saved, not what the client happened to send.
        var distinctCount = tags
            .Select(t => t.Trim())
            .Where(t => t.Length > 0)
            .Select(t => t.ToLowerInvariant())
            .Distinct()
            .Count();

        if (distinctCount > MaxTagCount)
        {
            errors.AddError("Tags", $"Tối đa {MaxTagCount} thẻ.");
        }

        foreach (var tag in tags)
        {
            var trimmed = tag.Trim();
            if (trimmed.Length > MaxTagLength)
            {
                errors.AddError("Tags", $"Mỗi thẻ tối đa {MaxTagLength} ký tự (\"{trimmed}\" dài hơn).");
                break;
            }
        }
    }

    private async Task ValidateAreaAsync(
        Guid? areaId,
        Dictionary<string, List<string>> errors,
        CancellationToken cancellationToken
    )
    {
        if (areaId is null)
        {
            return;
        }
        var area = await areaRepository.GetByIdAsync(areaId.Value, cancellationToken);
        if (area is null)
        {
            errors.AddError("AreaId", "Không tìm thấy lĩnh vực.");
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
#pragma warning disable CS0618 // Area (legacy enum) still exposed for back-compat read paths; AreaId/AreaName* are the live values.
        return new TaskResponse(
            task.Id,
            task.Name,
            task.Description,
            task.Area,
            task.AreaId,
            task.TaskArea?.NameVi,
            task.TaskArea?.NameEn,
            task.ProjectId,
            task.Category,
            task.Tags.Select(t => t.Name).OrderBy(n => n).ToList(),
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
            hasOpenDuplicateName,
            task.Version
        );
#pragma warning restore CS0618
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
