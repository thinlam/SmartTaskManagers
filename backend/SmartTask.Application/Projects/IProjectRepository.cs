using SmartTask.Domain.Projects;

namespace SmartTask.Application.Projects;

/// <summary>Application depends on this; SmartTask.Persistence implements it against AppDbContext.</summary>
public interface IProjectRepository
{
    Task<List<Project>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Project?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddAsync(Project project, CancellationToken cancellationToken = default);
    void Remove(Project project);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
