using SmartTask.Domain.Enums;

namespace SmartTask.Application.Sync;

/// <summary>
/// Phase 28 — Google Sheets ↔ Backend sync. Two operations only:
///
///   POST /api/sync/push  — Sheets sends every row it has marked dirty
///                           (its own SyncStatus = "NotSynced") since its
///                           last successful sync. Reconciled by
///                           ExternalId (the Sheets display id, e.g.
///                           "TASK-0001"), not by backend Id — Sheets may
///                           not know the backend Id yet on first push.
///
///   GET  /api/sync/pull  — Sheets asks "what changed on your side after
///                           this timestamp", to pick up edits made
///                           through the Desktop app or the API directly.
///
/// Conflict resolution is last-write-wins by UpdatedAt, applied on both
/// ends symmetrically: push only overwrites a backend row when the
/// incoming UpdatedAt is >= what's stored (SkippedOlder otherwise, and
/// the caller's next pull will bring back the backend's newer value);
/// Sheets applies the same rule locally when consuming a pull response
/// (15_Sync.gs's applyPullRow_). Neither side is ever treated as always-
/// authoritative — see docs/architecture/ARCHITECTURE.md's Sync section.
/// </summary>
public enum SyncItemOutcome
{
    Created,
    Updated,
    SkippedOlder,
    Error,
}

public sealed record SyncPushItemResult(
    string ExternalId,
    Guid? Id,
    SyncItemOutcome Outcome,
    DateTimeOffset? UpdatedAt,
    int? Version,
    string? Message
);

/* ==========================================================================
 * TASKS
 * ========================================================================== */

public sealed record SyncTaskItem(
    string ExternalId,
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
    string? Notes,
    DateTimeOffset UpdatedAt,
    /// <summary>
    /// The backend Id, if Sheets already knows it (its own BackendId
    /// column). Takes priority over ExternalId lookup when present — the
    /// case that matters: a row pulled in from a Desktop/API-only entity
    /// has no ExternalId on the backend yet, only an Id; once Sheets
    /// assigns it a local display id and pushes again, matching by Id
    /// (not the still-empty backend ExternalId) is what keeps this from
    /// creating a duplicate row.
    /// </summary>
    Guid? Id = null
);

public sealed record SyncTaskResponse(
    Guid Id,
    string? ExternalId,
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
    string? Notes,
    DateTimeOffset UpdatedAt,
    int Version
);

/* ==========================================================================
 * PROJECTS
 * ========================================================================== */

public sealed record SyncProjectItem(
    string ExternalId,
    string Name,
    AreaType Area,
    DateOnly? TargetDate,
    string? Description,
    DateTimeOffset UpdatedAt,
    /// <summary>See SyncTaskItem.Id's doc comment.</summary>
    Guid? Id = null
);

public sealed record SyncProjectResponse(
    Guid Id,
    string? ExternalId,
    string Name,
    AreaType Area,
    ProjectHealthLevel Health,
    DateOnly? TargetDate,
    string? Description,
    DateTimeOffset UpdatedAt,
    int Version
);

/* ==========================================================================
 * GOALS
 * ========================================================================== */

public sealed record SyncGoalItem(
    string ExternalId,
    string Name,
    AreaType Area,
    DateOnly? TargetDate,
    int Progress,
    GoalStatusType Status,
    DateTimeOffset UpdatedAt,
    /// <summary>See SyncTaskItem.Id's doc comment.</summary>
    Guid? Id = null
);

public sealed record SyncGoalResponse(
    Guid Id,
    string? ExternalId,
    string Name,
    AreaType Area,
    DateOnly? TargetDate,
    int Progress,
    GoalStatusType Status,
    DateTimeOffset UpdatedAt,
    int Version
);

/* ==========================================================================
 * HABITS
 * ========================================================================== */

public sealed record SyncHabitItem(
    string ExternalId,
    string Name,
    HabitFrequencyType Frequency,
    int Streak,
    int TargetCount,
    int CompletedCount,
    DateOnly? LastCompletedDate,
    DateTimeOffset UpdatedAt,
    /// <summary>See SyncTaskItem.Id's doc comment.</summary>
    Guid? Id = null
);

public sealed record SyncHabitResponse(
    Guid Id,
    string? ExternalId,
    string Name,
    HabitFrequencyType Frequency,
    int Streak,
    int TargetCount,
    int CompletedCount,
    DateOnly? LastCompletedDate,
    DateTimeOffset UpdatedAt,
    int Version
);

/* ==========================================================================
 * PUSH / PULL ENVELOPES
 * ========================================================================== */

public sealed class SyncPushRequest
{
    public List<SyncTaskItem> Tasks { get; init; } = [];
    public List<SyncProjectItem> Projects { get; init; } = [];
    public List<SyncGoalItem> Goals { get; init; } = [];
    public List<SyncHabitItem> Habits { get; init; } = [];
}

public sealed record SyncPushResponse(
    List<SyncPushItemResult> Tasks,
    List<SyncPushItemResult> Projects,
    List<SyncPushItemResult> Goals,
    List<SyncPushItemResult> Habits
);

public sealed record SyncPullResponse(
    DateTimeOffset ServerTime,
    List<SyncTaskResponse> Tasks,
    List<SyncProjectResponse> Projects,
    List<SyncGoalResponse> Goals,
    List<SyncHabitResponse> Habits
);
