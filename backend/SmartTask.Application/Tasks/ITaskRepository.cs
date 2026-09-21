using SmartTask.Domain.Tasks;

namespace SmartTask.Application.Tasks;

/// <summary>Application depends on this; SmartTask.Persistence implements it against AppDbContext.</summary>
public interface ITaskRepository
{
    Task<List<TaskItem>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<TaskItem?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddAsync(TaskItem task, CancellationToken cancellationToken = default);
    void Remove(TaskItem task);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
