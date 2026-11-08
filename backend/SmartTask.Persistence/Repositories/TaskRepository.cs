using Microsoft.EntityFrameworkCore;
using SmartTask.Application.Abstractions;
using SmartTask.Application.Tasks;
using SmartTask.Domain.Tasks;

namespace SmartTask.Persistence.Repositories;

public sealed class TaskRepository(AppDbContext dbContext, ICurrentUserContext currentUserContext)
    : ITaskRepository
{
    public Task<List<TaskItem>> GetAllAsync(CancellationToken cancellationToken = default) =>
        dbContext.Tasks.AsNoTracking().Include(t => t.Tags).ToListAsync(cancellationToken);

    public Task<TaskItem?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        dbContext.Tasks.Include(t => t.Tags).FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

    public Task<TaskItem?> GetByIdIncludingDeletedAsync(
        Guid id,
        CancellationToken cancellationToken = default
    ) =>
        dbContext
            .Tasks.IgnoreQueryFilters()
            .Include(t => t.Tags)
            .Where(t => t.UserId == currentUserContext.UserId)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

    public Task<bool> ExistsOpenWithNameAsync(
        string name,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default
    ) =>
        dbContext
            .Tasks.AsNoTracking()
            .Where(t => t.Name.ToLower() == name.ToLower())
            .Where(t => t.Status != Domain.Enums.TaskStatusType.Completed)
            .Where(t => excludeId == null || t.Id != excludeId)
            .AnyAsync(cancellationToken);

    public Task<int> CountAsync(CancellationToken cancellationToken = default) =>
        dbContext.Tasks.AsNoTracking().CountAsync(cancellationToken);

    public Task<TaskItem?> GetByExternalIdAsync(
        string externalId,
        CancellationToken cancellationToken = default
    ) => dbContext.Tasks.FirstOrDefaultAsync(t => t.ExternalId == externalId, cancellationToken);

    public Task<List<TaskItem>> GetChangedSinceAsync(
        DateTimeOffset since,
        CancellationToken cancellationToken = default
    ) =>
        dbContext
            .Tasks.AsNoTracking()
            .Where(t => t.UpdatedAt > since)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(TaskItem task, CancellationToken cancellationToken = default) =>
        await dbContext.Tasks.AddAsync(task, cancellationToken);

    public void Remove(TaskItem task) => dbContext.Tasks.Remove(task);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        dbContext.SaveChangesAsync(cancellationToken);

    public void DiscardTracking() => dbContext.ChangeTracker.Clear();
}
