using SmartTask.Application.Abstractions;
using SmartTask.Domain.Habits;

namespace SmartTask.Application.Habits;

/// <summary>Same shape as Phase 25's GoalService — orchestrates only through IHabitRepository/IDateTimeProvider.</summary>
public sealed class HabitService(IHabitRepository habitRepository, IDateTimeProvider dateTimeProvider)
    : IHabitService
{
    public async Task<List<HabitResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var habits = await habitRepository.GetAllAsync(cancellationToken);
        return habits.Select(ToResponse).ToList();
    }

    public async Task<HabitResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var habit = await habitRepository.GetByIdAsync(id, cancellationToken);
        return habit is null ? null : ToResponse(habit);
    }

    public async Task<HabitResponse> CreateAsync(
        CreateHabitRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var now = dateTimeProvider.UtcNow;
        var habit = new Habit
        {
            Name = request.Name,
            Frequency = request.Frequency,
            TargetCount = request.TargetCount,
            CreatedAt = now,
            UpdatedAt = now,
        };

        await habitRepository.AddAsync(habit, cancellationToken);
        await habitRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(habit);
    }

    public async Task<HabitResponse?> UpdateAsync(
        Guid id,
        UpdateHabitRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var habit = await habitRepository.GetByIdAsync(id, cancellationToken);
        if (habit is null)
        {
            return null;
        }

        habit.Name = request.Name ?? habit.Name;
        habit.Frequency = request.Frequency ?? habit.Frequency;
        habit.TargetCount = request.TargetCount ?? habit.TargetCount;
        habit.UpdatedAt = dateTimeProvider.UtcNow;

        await habitRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(habit);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var habit = await habitRepository.GetByIdAsync(id, cancellationToken);
        if (habit is null)
        {
            return false;
        }

        habitRepository.Remove(habit);
        await habitRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<HabitResponse?> CheckInAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var habit = await habitRepository.GetByIdAsync(id, cancellationToken);
        if (habit is null)
        {
            return null;
        }

        var today = DateOnly.FromDateTime(dateTimeProvider.UtcNow.UtcDateTime);
        if (habit.LastCompletedDate == today)
        {
            return ToResponse(habit);
        }

        habit.Streak += 1;
        habit.CompletedCount += 1;
        habit.LastCompletedDate = today;
        habit.UpdatedAt = dateTimeProvider.UtcNow;

        await habitRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(habit);
    }

    private static HabitResponse ToResponse(Habit habit) =>
        new(
            habit.Id,
            habit.Name,
            habit.Frequency,
            habit.Streak,
            habit.TargetCount,
            habit.CompletedCount,
            habit.LastCompletedDate,
            habit.CreatedAt,
            habit.UpdatedAt
        );
}
