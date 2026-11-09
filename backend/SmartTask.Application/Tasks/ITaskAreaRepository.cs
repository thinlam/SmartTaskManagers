using SmartTask.Domain.Tasks;

namespace SmartTask.Application.Tasks;

/// <summary>Application depends on this; SmartTask.Persistence implements it against AppDbContext.</summary>
public interface ITaskAreaRepository
{
    /// <summary>System rows (shared) plus the current user's own custom rows — the global query filter already does that scoping.</summary>
    Task<List<TaskArea>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<TaskArea?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<TaskItem>> GetTasksUsingAreaAsync(Guid areaId, CancellationToken cancellationToken = default);
    Task AddAsync(TaskArea area, CancellationToken cancellationToken = default);
    void Remove(TaskArea area);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
