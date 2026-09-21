using SmartTask.Domain.Projects;

namespace SmartTask.Application.Projects;

/// <summary>Application depends on this; SmartTask.Persistence implements it against AppDbContext.</summary>
public interface IProjectRepository
{
    Task<List<Project>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Project?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Phase 28 sync's join lookup — finds the row a given Sheets ProjectId already maps to, if any.</summary>
    Task<Project?> GetByExternalIdAsync(string externalId, CancellationToken cancellationToken = default);

    /// <summary>Phase 28 pull — everything changed after <paramref name="since"/>, for Sheets to catch up on.</summary>
    Task<List<Project>> GetChangedSinceAsync(
        DateTimeOffset since,
        CancellationToken cancellationToken = default
    );
    Task AddAsync(Project project, CancellationToken cancellationToken = default);
    void Remove(Project project);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>Phase 28 sync — see ITaskRepository.DiscardTracking's doc comment.</summary>
    void DiscardTracking();
}
