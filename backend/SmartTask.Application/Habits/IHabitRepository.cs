using SmartTask.Domain.Habits;

namespace SmartTask.Application.Habits;

/// <summary>Application depends on this; SmartTask.Persistence implements it against AppDbContext.</summary>
public interface IHabitRepository
{
    Task<List<Habit>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Habit?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Phase 28 sync's join lookup — finds the row a given Sheets HabitId already maps to, if any.</summary>
    Task<Habit?> GetByExternalIdAsync(string externalId, CancellationToken cancellationToken = default);

    /// <summary>Phase 28 pull — everything changed after <paramref name="since"/>, for Sheets to catch up on.</summary>
    Task<List<Habit>> GetChangedSinceAsync(
        DateTimeOffset since,
        CancellationToken cancellationToken = default
    );
    Task AddAsync(Habit habit, CancellationToken cancellationToken = default);
    void Remove(Habit habit);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>Phase 28 sync — see ITaskRepository.DiscardTracking's doc comment.</summary>
    void DiscardTracking();
}
