using System.ComponentModel.DataAnnotations;
using SmartTask.Domain.Enums;

namespace SmartTask.Application.Tasks;

/// <summary>
/// Full read shape — every column on TaskItem except the sync columns
/// (SyncStatus/LastSyncedAt/Version), which are a Phase 28 concern with
/// no API consumer yet. Enums serialize as strings, not ints — see
/// Program.cs's JsonStringEnumConverter registration.
/// </summary>
public sealed record TaskResponse(
    Guid Id,
    string Name,
    string? Description,
    AreaType Area,
    Guid? ProjectId,
    string? Category,
    string? Tags,
    PriorityLevel Priority,
    TaskStatusType Status,
    DateOnly? StartDate,
    DateOnly? DueDate,
    TimeOnly? DueTime,
    DateTimeOffset? CompletedDate,
    int Progress,
    int? EstimateMinutes,
    EnergyLevel? Energy,
    TaskContextType? Context,
    Guid? GoalId,
    RecurringTypeOption RecurringType,
    Guid? DependencyTaskId,
    int? SmartScore,
    RiskLevel? Risk,
    string? RecommendedAction,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? LastStatusChangedAt,
    string? Notes
);

public sealed class CreateTaskRequest
{
    [Required]
    [MaxLength(500)]
    public required string Name { get; init; }

    public string? Description { get; init; }
    public AreaType Area { get; init; } = AreaType.Personal;
    public Guid? ProjectId { get; init; }

    [MaxLength(100)]
    public string? Category { get; init; }

    [MaxLength(1000)]
    public string? Tags { get; init; }
    public PriorityLevel Priority { get; init; } = PriorityLevel.Medium;
    public TaskStatusType Status { get; init; } = TaskStatusType.Inbox;
    public DateOnly? StartDate { get; init; }
    public DateOnly? DueDate { get; init; }
    public TimeOnly? DueTime { get; init; }

    [Range(0, 100)]
    public int Progress { get; init; }
    public int? EstimateMinutes { get; init; }
    public EnergyLevel? Energy { get; init; }
    public TaskContextType? Context { get; init; }
    public Guid? GoalId { get; init; }
    public RecurringTypeOption RecurringType { get; init; } = RecurringTypeOption.None;
    public Guid? DependencyTaskId { get; init; }

    [MaxLength(4000)]
    public string? Notes { get; init; }
}

/// <summary>
/// Partial update — every property is optional, and a provided value
/// replaces the current one. Known, documented limitation: because this
/// binds a plain JSON object, there's no way to tell "field omitted,
/// leave alone" apart from "field explicitly set to null" for the
/// entity's own nullable columns (Description/ProjectId/Category/Tags/
/// StartDate/DueDate/DueTime/EstimateMinutes/Energy/Context/GoalId/
/// DependencyTaskId/Notes) — TaskService treats both the same (skip),
/// so this endpoint can set those fields but can't yet clear one back to
/// null. Real JSON Merge Patch / JSON Patch support would fix that;
/// deliberately not added this phase to keep the DTO a plain POCO.
/// </summary>
public sealed class UpdateTaskRequest
{
    [MaxLength(500)]
    public string? Name { get; init; }
    public string? Description { get; init; }
    public AreaType? Area { get; init; }
    public Guid? ProjectId { get; init; }

    [MaxLength(100)]
    public string? Category { get; init; }

    [MaxLength(1000)]
    public string? Tags { get; init; }
    public PriorityLevel? Priority { get; init; }
    public TaskStatusType? Status { get; init; }
    public DateOnly? StartDate { get; init; }
    public DateOnly? DueDate { get; init; }
    public TimeOnly? DueTime { get; init; }

    [Range(0, 100)]
    public int? Progress { get; init; }
    public int? EstimateMinutes { get; init; }
    public EnergyLevel? Energy { get; init; }
    public TaskContextType? Context { get; init; }
    public Guid? GoalId { get; init; }
    public RecurringTypeOption? RecurringType { get; init; }
    public Guid? DependencyTaskId { get; init; }

    [MaxLength(4000)]
    public string? Notes { get; init; }
}
