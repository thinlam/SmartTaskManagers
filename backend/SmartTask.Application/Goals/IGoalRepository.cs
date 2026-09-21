using SmartTask.Domain.Goals;

namespace SmartTask.Application.Goals;

/// <summary>Application depends on this; SmartTask.Persistence implements it against AppDbContext.</summary>
public interface IGoalRepository
{
    Task<List<Goal>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Goal?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Phase 28 sync's join lookup — finds the row a given Sheets GoalId already maps to, if any.</summary>
    Task<Goal?> GetByExternalIdAsync(string externalId, CancellationToken cancellationToken = default);

    /// <summary>Phase 28 pull — everything changed after <paramref name="since"/>, for Sheets to catch up on.</summary>
    Task<List<Goal>> GetChangedSinceAsync(
        DateTimeOffset since,
        CancellationToken cancellationToken = default
    );
    Task AddAsync(Goal goal, CancellationToken cancellationToken = default);
    void Remove(Goal goal);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>Phase 28 sync — see ITaskRepository.DiscardTracking's doc comment.</summary>
    void DiscardTracking();
}
