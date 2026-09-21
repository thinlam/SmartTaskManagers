using Microsoft.EntityFrameworkCore;
using SmartTask.Application.Tasks;
using SmartTask.Domain.Tasks;

namespace SmartTask.Persistence.Repositories;

public sealed class TaskRepository(AppDbContext dbContext) : ITaskRepository
{
    public Task<List<TaskItem>> GetAllAsync(CancellationToken cancellationToken = default) =>
        dbContext.Tasks.AsNoTracking().ToListAsync(cancellationToken);

    public Task<TaskItem?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        dbContext.Tasks.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

    public async Task AddAsync(TaskItem task, CancellationToken cancellationToken = default) =>
        await dbContext.Tasks.AddAsync(task, cancellationToken);

    public void Remove(TaskItem task) => dbContext.Tasks.Remove(task);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
