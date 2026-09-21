using System.ComponentModel.DataAnnotations;
using SmartTask.Domain.Enums;

namespace SmartTask.Application.Goals;

public sealed record GoalResponse(
    Guid Id,
    string Name,
    AreaType Area,
    DateOnly? TargetDate,
    int Progress,
    GoalStatusType Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

/// <summary>
/// Unlike Phase 24's Project (whose Health is always computed, never
/// entered), Goal's `Progress`/`Status` ARE plain user-set fields here —
/// same as the frontend's GoalDetailDrawer (Phase 14) and matching
/// Goal's own doc comment: Sheets has no computed-metrics engine for
/// Goals at all, so there's no "computed" semantics to protect by
/// excluding these from the request DTOs.
/// </summary>
public sealed class CreateGoalRequest
{
    [Required]
    [MaxLength(200)]
    public required string Name { get; init; }

    public AreaType Area { get; init; } = AreaType.Personal;
    public DateOnly? TargetDate { get; init; }

    [Range(0, 100)]
    public int Progress { get; init; }
    public GoalStatusType Status { get; init; } = GoalStatusType.OnTrack;
}

public sealed class UpdateGoalRequest
{
    [MaxLength(200)]
    public string? Name { get; init; }

    public AreaType? Area { get; init; }
    public DateOnly? TargetDate { get; init; }

    [Range(0, 100)]
    public int? Progress { get; init; }
    public GoalStatusType? Status { get; init; }
}
