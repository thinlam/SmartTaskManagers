using SmartTask.Domain.Goals;

namespace SmartTask.Application.Goals;

/// <summary>Application depends on this; SmartTask.Persistence implements it against AppDbContext.</summary>
public interface IGoalRepository
{
    Task<List<Goal>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Goal?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddAsync(Goal goal, CancellationToken cancellationToken = default);
    void Remove(Goal goal);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
