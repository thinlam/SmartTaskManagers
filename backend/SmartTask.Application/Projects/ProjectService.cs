using SmartTask.Application.Abstractions;
using SmartTask.Domain.Projects;

namespace SmartTask.Application.Projects;

/// <summary>Same shape as Phase 23's TaskService — orchestrates only through IProjectRepository/IDateTimeProvider.</summary>
public sealed class ProjectService(
    IProjectRepository projectRepository,
    IDateTimeProvider dateTimeProvider
) : IProjectService
{
    public async Task<List<ProjectResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var projects = await projectRepository.GetAllAsync(cancellationToken);
        return projects.Select(ToResponse).ToList();
    }

    public async Task<ProjectResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var project = await projectRepository.GetByIdAsync(id, cancellationToken);
        return project is null ? null : ToResponse(project);
    }

    public async Task<ProjectResponse> CreateAsync(
        CreateProjectRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var now = dateTimeProvider.UtcNow;
        var project = new Project
        {
            Name = request.Name,
            Area = request.Area,
            TargetDate = request.TargetDate,
            Description = request.Description,
            CreatedAt = now,
            UpdatedAt = now,
        };

        await projectRepository.AddAsync(project, cancellationToken);
        await projectRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(project);
    }

    public async Task<ProjectResponse?> UpdateAsync(
        Guid id,
        UpdateProjectRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var project = await projectRepository.GetByIdAsync(id, cancellationToken);
        if (project is null)
        {
            return null;
        }

        project.Name = request.Name ?? project.Name;
        project.Area = request.Area ?? project.Area;
        project.TargetDate = request.TargetDate ?? project.TargetDate;
        project.Description = request.Description ?? project.Description;
        project.UpdatedAt = dateTimeProvider.UtcNow;

        await projectRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(project);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var project = await projectRepository.GetByIdAsync(id, cancellationToken);
        if (project is null)
        {
            return false;
        }

        projectRepository.Remove(project);
        await projectRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static ProjectResponse ToResponse(Project project) =>
        new(
            project.Id,
            project.Name,
            project.Area,
            project.Health,
            project.TargetDate,
            project.Description,
            project.CreatedAt,
            project.UpdatedAt
        );
}
