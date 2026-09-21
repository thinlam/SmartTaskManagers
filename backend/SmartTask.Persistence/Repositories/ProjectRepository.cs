using Microsoft.EntityFrameworkCore;
using SmartTask.Application.Projects;
using SmartTask.Domain.Projects;

namespace SmartTask.Persistence.Repositories;

public sealed class ProjectRepository(AppDbContext dbContext) : IProjectRepository
{
    public Task<List<Project>> GetAllAsync(CancellationToken cancellationToken = default) =>
        dbContext.Projects.AsNoTracking().ToListAsync(cancellationToken);

    public Task<Project?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        dbContext.Projects.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

    public async Task AddAsync(Project project, CancellationToken cancellationToken = default) =>
        await dbContext.Projects.AddAsync(project, cancellationToken);

    public void Remove(Project project) => dbContext.Projects.Remove(project);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
