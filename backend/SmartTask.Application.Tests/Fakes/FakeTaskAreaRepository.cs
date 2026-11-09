using SmartTask.Application.Tasks;
using SmartTask.Domain.Tasks;

namespace SmartTask.Application.Tests.Fakes;

public sealed class FakeTaskAreaRepository : ITaskAreaRepository
{
    private readonly List<TaskArea> items = [];

    public Task<List<TaskArea>> GetAllAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(items.ToList());

    public Task<TaskArea?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(items.FirstOrDefault(a => a.Id == id));

    public Task<List<TaskItem>> GetTasksUsingAreaAsync(
        Guid areaId,
        CancellationToken cancellationToken = default
    ) => Task.FromResult(items.FirstOrDefault(a => a.Id == areaId)?.Tasks.ToList() ?? []);

    public Task AddAsync(TaskArea area, CancellationToken cancellationToken = default)
    {
        items.Add(area);
        return Task.CompletedTask;
    }

    public void Remove(TaskArea area) => items.Remove(area);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;

    /// <summary>Test-only seam — seeds an area without going through CreateAsync (e.g. a system row).</summary>
    public void Seed(TaskArea area) => items.Add(area);
}
