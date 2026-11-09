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

    /// <summary>
    /// Soft delete (sets IsDeleted/DeletedAt) — true if a task was found and deleted. RestoreAsync
    /// undoes this. If the task has subtasks and <paramref name="cascadeSubtasks"/> is null, throws
    /// TaskActionRequiresConfirmationException instead of deleting (client must ask the user and
    /// retry with true = delete subtasks too, or false = promote them to top-level).
    /// </summary>
    Task<bool> DeleteAsync(
        Guid id,
        bool? cascadeSubtasks = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>Undo for DeleteAsync — null if no (deleted) task with this id exists, or it wasn't deleted.</summary>
    Task<TaskResponse?> RestoreAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sets Status=Completed, Progress=100, CompletedDate=now; cancels an unfired reminder; creates
    /// the next occurrence if the task recurs. If it has incomplete subtasks and
    /// <paramref name="confirmCompleteSubtasks"/> is false, throws TaskActionRequiresConfirmationException
    /// instead of completing (client must ask the user and retry with true to also complete them).
    /// Null if no task with this id exists; a no-op returning the current state if already Completed.
    /// </summary>
    Task<TaskResponse?> CompleteAsync(
        Guid id,
        bool confirmCompleteSubtasks = false,
        CancellationToken cancellationToken = default
    );
}
