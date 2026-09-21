using SmartTask.Domain.Tasks;

namespace SmartTask.Application.Tasks;

/// <summary>Application depends on this; SmartTask.Persistence implements it against AppDbContext.</summary>
public interface ITaskRepository
{
    Task<List<TaskItem>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<TaskItem?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Phase 28 sync's join lookup — finds the row a given Sheets TaskId already maps to, if any.</summary>
    Task<TaskItem?> GetByExternalIdAsync(string externalId, CancellationToken cancellationToken = default);

    /// <summary>Phase 28 pull — everything changed after <paramref name="since"/>, for Sheets to catch up on.</summary>
    Task<List<TaskItem>> GetChangedSinceAsync(
        DateTimeOffset since,
        CancellationToken cancellationToken = default
    );
    Task AddAsync(TaskItem task, CancellationToken cancellationToken = default);
    void Remove(TaskItem task);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Phase 28 sync — a SaveChangesAsync failure (bad FK, etc.) leaves
    /// the failed entity tracked; without clearing it, every later
    /// SaveChangesAsync call in the same push batch keeps re-attempting
    /// that same broken save and fails too, even for otherwise-valid
    /// items. Call after catching a save failure, before moving to the
    /// next item.
    /// </summary>
    void DiscardTracking();
}
