using Microsoft.EntityFrameworkCore;
using SmartTask.Application.Goals;
using SmartTask.Domain.Goals;

namespace SmartTask.Persistence.Repositories;

public sealed class GoalRepository(AppDbContext dbContext) : IGoalRepository
{
    public Task<List<Goal>> GetAllAsync(CancellationToken cancellationToken = default) =>
        dbContext.Goals.AsNoTracking().ToListAsync(cancellationToken);

    public Task<Goal?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        dbContext.Goals.FirstOrDefaultAsync(g => g.Id == id, cancellationToken);

    public async Task AddAsync(Goal goal, CancellationToken cancellationToken = default) =>
        await dbContext.Goals.AddAsync(goal, cancellationToken);

    public void Remove(Goal goal) => dbContext.Goals.Remove(goal);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
