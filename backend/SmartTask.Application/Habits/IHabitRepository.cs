using SmartTask.Domain.Habits;

namespace SmartTask.Application.Habits;

/// <summary>Application depends on this; SmartTask.Persistence implements it against AppDbContext.</summary>
public interface IHabitRepository
{
    Task<List<Habit>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Habit?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddAsync(Habit habit, CancellationToken cancellationToken = default);
    void Remove(Habit habit);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
