using SmartTask.Application.Tasks;
using SmartTask.Domain.Enums;
using SmartTask.Domain.Tasks;

namespace SmartTask.Application.Tests.Fakes;

/// <summary>
/// In-memory stand-in for ITaskRepository — mirrors AppDbContext's query
/// filter (GetAllAsync/GetByIdAsync hide soft-deleted rows; only
/// GetByIdIncludingDeletedAsync sees them) without needing a real EF Core
/// provider, so TaskServiceTests can run with no database at all.
/// </summary>
public sealed class FakeTaskRepository : ITaskRepository
{
    private readonly List<TaskItem> items = [];

    public Task<List<TaskItem>> GetAllAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(items.Where(t => !t.IsDeleted).ToList());

    public Task<TaskItem?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(items.FirstOrDefault(t => t.Id == id && !t.IsDeleted));

    public Task<TaskItem?> GetByIdIncludingDeletedAsync(
        Guid id,
        CancellationToken cancellationToken = default
    ) => Task.FromResult(items.FirstOrDefault(t => t.Id == id));

    public Task<bool> ExistsOpenWithNameAsync(
        string name,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default
    ) =>
        Task.FromResult(
            items.Any(t =>
                !t.IsDeleted
                && string.Equals(t.Name, name, StringComparison.OrdinalIgnoreCase)
                && t.Status != TaskStatusType.Completed
                && (excludeId == null || t.Id != excludeId)
            )
        );

    public Task<int> CountAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(items.Count(t => !t.IsDeleted));

    public Task<List<TaskItem>> GetSubtasksAsync(
        Guid parentId,
        CancellationToken cancellationToken = default
    ) => Task.FromResult(items.Where(t => t.ParentTaskId == parentId && !t.IsDeleted).ToList());

    public List<TaskActivityLog> ActivityLogs { get; } = [];

    public void AddActivityLog(TaskActivityLog log) => ActivityLogs.Add(log);

    public Task<TaskItem?> GetByExternalIdAsync(
        string externalId,
        CancellationToken cancellationToken = default
    ) => Task.FromResult(items.FirstOrDefault(t => t.ExternalId == externalId));

    public Task<List<TaskItem>> GetChangedSinceAsync(
        DateTimeOffset since,
        CancellationToken cancellationToken = default
    ) => Task.FromResult(items.Where(t => t.UpdatedAt > since).ToList());

    public Task AddAsync(TaskItem task, CancellationToken cancellationToken = default)
    {
        items.Add(task);
        return Task.CompletedTask;
    }

    public void Remove(TaskItem task) => items.Remove(task);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;

    public void DiscardTracking() { }

    /// <summary>Test-only seam — lets a test put a task straight into the store without going through CreateAsync.</summary>
    public void Seed(TaskItem task) => items.Add(task);
}
