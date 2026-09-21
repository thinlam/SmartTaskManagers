namespace SmartTask.Application.Habits;

public interface IHabitService
{
    Task<List<HabitResponse>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<HabitResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<HabitResponse> CreateAsync(
        CreateHabitRequest request,
        CancellationToken cancellationToken = default
    );

    /// <summary>Null if no habit with this id exists.</summary>
    Task<HabitResponse?> UpdateAsync(
        Guid id,
        UpdateHabitRequest request,
        CancellationToken cancellationToken = default
    );

    /// <summary>True if a habit was found and deleted.</summary>
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// +1 Streak, +1 CompletedCount, LastCompletedDate = today — mirrors
    /// packages/hooks's useHabits.checkInHabit() on the frontend
    /// (Phase 15). No-op (returns the habit unchanged) if already
    /// checked in today, so calling this twice on the same day never
    /// double-counts. Null if no habit with this id exists.
    /// </summary>
    Task<HabitResponse?> CheckInAsync(Guid id, CancellationToken cancellationToken = default);
}
