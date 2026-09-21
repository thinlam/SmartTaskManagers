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

    /// <summary>True if a task was found and deleted.</summary>
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Sets Status=Completed, Progress=100, CompletedDate=now — mirrors packages/hooks's useTasks.completeTask() on the frontend. Null if no task with this id exists.</summary>
    Task<TaskResponse?> CompleteAsync(Guid id, CancellationToken cancellationToken = default);
}
