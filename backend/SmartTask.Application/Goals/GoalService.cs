using SmartTask.Application.Abstractions;
using SmartTask.Domain.Goals;

namespace SmartTask.Application.Goals;

/// <summary>Same shape as Phase 24's ProjectService — orchestrates only through IGoalRepository/IDateTimeProvider.</summary>
public sealed class GoalService(IGoalRepository goalRepository, IDateTimeProvider dateTimeProvider)
    : IGoalService
{
    public async Task<List<GoalResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var goals = await goalRepository.GetAllAsync(cancellationToken);
        return goals.Select(ToResponse).ToList();
    }

    public async Task<GoalResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var goal = await goalRepository.GetByIdAsync(id, cancellationToken);
        return goal is null ? null : ToResponse(goal);
    }

    public async Task<GoalResponse> CreateAsync(
        CreateGoalRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var now = dateTimeProvider.UtcNow;
        var goal = new Goal
        {
            Name = request.Name,
            Area = request.Area,
            TargetDate = request.TargetDate,
            Progress = request.Progress,
            Status = request.Status,
            CreatedAt = now,
            UpdatedAt = now,
        };

        await goalRepository.AddAsync(goal, cancellationToken);
        await goalRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(goal);
    }

    public async Task<GoalResponse?> UpdateAsync(
        Guid id,
        UpdateGoalRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var goal = await goalRepository.GetByIdAsync(id, cancellationToken);
        if (goal is null)
        {
            return null;
        }

        goal.Name = request.Name ?? goal.Name;
        goal.Area = request.Area ?? goal.Area;
        goal.TargetDate = request.TargetDate ?? goal.TargetDate;
        goal.Progress = request.Progress ?? goal.Progress;
        goal.Status = request.Status ?? goal.Status;
        goal.UpdatedAt = dateTimeProvider.UtcNow;

        await goalRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(goal);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var goal = await goalRepository.GetByIdAsync(id, cancellationToken);
        if (goal is null)
        {
            return false;
        }

        goalRepository.Remove(goal);
        await goalRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static GoalResponse ToResponse(Goal goal) =>
        new(
            goal.Id,
            goal.Name,
            goal.Area,
            goal.TargetDate,
            goal.Progress,
            goal.Status,
            goal.CreatedAt,
            goal.UpdatedAt
        );
}
