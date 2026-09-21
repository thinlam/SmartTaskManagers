namespace SmartTask.Application.Projects;

public interface IProjectService
{
    Task<List<ProjectResponse>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ProjectResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ProjectResponse> CreateAsync(
        CreateProjectRequest request,
        CancellationToken cancellationToken = default
    );

    /// <summary>Null if no project with this id exists.</summary>
    Task<ProjectResponse?> UpdateAsync(
        Guid id,
        UpdateProjectRequest request,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// True if a project was found and deleted. Deleting a project clears
    /// (doesn't cascade-delete) `ProjectId` on any tasks that referenced
    /// it — enforced at the database via Tasks.ProjectId's
    /// DeleteBehavior.SetNull (Phase 21), not app-level logic here.
    /// </summary>
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
