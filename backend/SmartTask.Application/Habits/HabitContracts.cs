using System.ComponentModel.DataAnnotations;
using SmartTask.Domain.Enums;

namespace SmartTask.Application.Habits;

public sealed record HabitResponse(
    Guid Id,
    string Name,
    HabitFrequencyType Frequency,
    int Streak,
    int TargetCount,
    int CompletedCount,
    DateOnly? LastCompletedDate,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

/// <summary>
/// No `Streak`/`CompletedCount`/`LastCompletedDate` on either request —
/// same as the frontend's HabitDetailDrawer (Phase 15): those only
/// change through the dedicated check-in action
/// (POST /api/habits/{id}/check-in), never hand-edited. There's nothing
/// to port from Sheets for this either — createHabit_() in
/// apps/google-sheets/src/03_Data.gs just zeroes them out, same as here.
/// </summary>
public sealed class CreateHabitRequest
{
    [Required]
    [MaxLength(200)]
    public required string Name { get; init; }

    public HabitFrequencyType Frequency { get; init; } = HabitFrequencyType.Daily;

    /// <summary>0 = no target set.</summary>
    [Range(0, int.MaxValue)]
    public int TargetCount { get; init; }
}

public sealed class UpdateHabitRequest
{
    [MaxLength(200)]
    public string? Name { get; init; }

    public HabitFrequencyType? Frequency { get; init; }

    [Range(0, int.MaxValue)]
    public int? TargetCount { get; init; }
}
