using SmartTask.Domain.Common;
using SmartTask.Domain.Enums;

namespace SmartTask.Domain.Habits;

/// <summary>
/// Matches HABIT_HEADERS in apps/google-sheets/src/00_Constants.gs.
/// Standalone, like the frontend's Habit (Phase 15) — grepping
/// apps/google-sheets/src confirmed no HabitId column anywhere on
/// TASK_HEADERS, so there's no Task→Habit foreign key to model here
/// either.
/// </summary>
public sealed class Habit : SyncableEntity
{
    /// <summary>The account that owns this habit. Set automatically by AppDbContext.SaveChangesAsync on insert — never set this directly.</summary>
    public Guid UserId { get; set; }

    public required string Name { get; set; }
    public HabitFrequencyType Frequency { get; set; } = HabitFrequencyType.Daily;
    public int Streak { get; set; }

    /// <summary>0 = no target set.</summary>
    public int TargetCount { get; set; }
    public int CompletedCount { get; set; }
    public DateOnly? LastCompletedDate { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
