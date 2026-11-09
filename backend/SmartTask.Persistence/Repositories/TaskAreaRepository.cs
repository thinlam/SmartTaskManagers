using Microsoft.EntityFrameworkCore;
using SmartTask.Application.Tasks;
using SmartTask.Domain.Tasks;

namespace SmartTask.Persistence.Repositories;

public sealed class TaskAreaRepository(AppDbContext dbContext) : ITaskAreaRepository
{
    public Task<List<TaskArea>> GetAllAsync(CancellationToken cancellationToken = default) =>
        dbContext.TaskAreas.Include(a => a.Tasks).ToListAsync(cancellationToken);

    public Task<TaskArea?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        dbContext.TaskAreas.Include(a => a.Tasks).FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

    public Task<List<TaskItem>> GetTasksUsingAreaAsync(
        Guid areaId,
        CancellationToken cancellationToken = default
    ) => dbContext.Tasks.Where(t => t.AreaId == areaId).ToListAsync(cancellationToken);

    public async Task AddAsync(TaskArea area, CancellationToken cancellationToken = default) =>
        await dbContext.TaskAreas.AddAsync(area, cancellationToken);

    public void Remove(TaskArea area) => dbContext.TaskAreas.Remove(area);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
