namespace SmartTask.Application.Goals;

public interface IGoalService
{
    Task<List<GoalResponse>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<GoalResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<GoalResponse> CreateAsync(
        CreateGoalRequest request,
        CancellationToken cancellationToken = default
    );

    /// <summary>Null if no goal with this id exists.</summary>
    Task<GoalResponse?> UpdateAsync(
        Guid id,
        UpdateGoalRequest request,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// True if a goal was found and deleted. Deleting a goal clears
    /// (doesn't cascade-delete) `GoalId` on any tasks that referenced
    /// it — enforced at the database via Tasks.GoalId's
    /// DeleteBehavior.SetNull (Phase 21), not app-level logic here.
    /// </summary>
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
