using Microsoft.EntityFrameworkCore;
using SmartTask.Application.Habits;
using SmartTask.Domain.Habits;

namespace SmartTask.Persistence.Repositories;

public sealed class HabitRepository(AppDbContext dbContext) : IHabitRepository
{
    public Task<List<Habit>> GetAllAsync(CancellationToken cancellationToken = default) =>
        dbContext.Habits.AsNoTracking().ToListAsync(cancellationToken);

    public Task<Habit?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        dbContext.Habits.FirstOrDefaultAsync(h => h.Id == id, cancellationToken);

    public Task<Habit?> GetByExternalIdAsync(
        string externalId,
        CancellationToken cancellationToken = default
    ) => dbContext.Habits.FirstOrDefaultAsync(h => h.ExternalId == externalId, cancellationToken);

    public Task<List<Habit>> GetChangedSinceAsync(
        DateTimeOffset since,
        CancellationToken cancellationToken = default
    ) => dbContext.Habits.AsNoTracking().Where(h => h.UpdatedAt > since).ToListAsync(cancellationToken);

    public async Task AddAsync(Habit habit, CancellationToken cancellationToken = default) =>
        await dbContext.Habits.AddAsync(habit, cancellationToken);

    public void Remove(Habit habit) => dbContext.Habits.Remove(habit);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        dbContext.SaveChangesAsync(cancellationToken);

    public void DiscardTracking() => dbContext.ChangeTracker.Clear();
}
