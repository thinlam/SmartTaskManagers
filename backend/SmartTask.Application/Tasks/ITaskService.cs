namespace SmartTask.Application.Tasks;

public interface ITaskService
{
    Task<List<TaskResponse>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<TaskResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<TaskResponse> CreateAsync(CreateTaskRequest request, CancellationToken cancellationToken = default);

    /// <summary>Null if no task with this id exists.</summary>
    Task<TaskResponse?> UpdateAsync(
        Guid id,
        UpdateTaskRequest request,
        CancellationToken cancellationToken = default
    );

    /// <summary>Soft delete (sets IsDeleted/DeletedAt) — true if a task was found and deleted. RestoreAsync undoes this.</summary>
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Undo for DeleteAsync — null if no (deleted) task with this id exists, or it wasn't deleted.</summary>
    Task<TaskResponse?> RestoreAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Sets Status=Completed, Progress=100, CompletedDate=now — mirrors packages/hooks's useTasks.completeTask() on the frontend. If the task recurs (RecurringType != None), also creates the next occurrence. Null if no task with this id exists.</summary>
    Task<TaskResponse?> CompleteAsync(Guid id, CancellationToken cancellationToken = default);
}
