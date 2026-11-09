namespace SmartTask.Application.Tasks;

public interface ITaskAreaService
{
    Task<List<TaskAreaResponse>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<TaskAreaResponse> CreateAsync(CreateTaskAreaRequest request, CancellationToken cancellationToken = default);
    Task<TaskAreaResponse?> RenameAsync(Guid id, RenameTaskAreaRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Null if the area doesn't exist. Throws TaskAreaInUseException if it still has tasks and
    /// request.ReplacementAreaId wasn't given. Throws TaskAreaValidationException for a system area
    /// (IsSystem) — those can never be deleted.
    /// </summary>
    Task<bool> DeleteAsync(Guid id, DeleteTaskAreaRequest request, CancellationToken cancellationToken = default);
}
