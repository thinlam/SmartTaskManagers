using SmartTask.Domain.Common;
using SmartTask.Domain.Enums;

namespace SmartTask.Domain.Tasks;

/// <summary>
/// Matches TASK_HEADERS in apps/google-sheets/src/00_Constants.gs
/// column-for-column, with two deliberate differences: (1) the primary
/// key is a UUID (Entity.Id), not the Sheets-style "TASK-0001" display
/// code — that code exists only because a spreadsheet has no surrogate
/// key concept, and a relational PK doesn't need it; Phase 28 sync can
/// reconcile by other means if it turns out to need one, not modeled
/// speculatively now. (2) SmartScore/Risk/RecommendedAction are present
/// as columns (per docs/architecture/ARCHITECTURE.md's "data model backend
/// phải có sẵn các cột này ngay từ Phase 21") but nothing computes them
/// yet — they stay null until Phase 29 ports 05_SmartEngine.gs.
///
/// Named TaskItem, not Task — System.Threading.Tasks.Task would collide.
/// </summary>
public sealed class TaskItem : SyncableEntity
{
    /// <summary>The account that owns this task. Set automatically by AppDbContext.SaveChangesAsync on insert — never set this directly.</summary>
    public Guid UserId { get; set; }

    public required string Name { get; set; }
    public string? Description { get; set; }
    public AreaType Area { get; set; }

    public Guid? ProjectId { get; set; }
    public Projects.Project? Project { get; set; }

    public string? Category { get; set; }

    /// <summary>Comma-separated, matching how Sheets itself stores Tags — not normalized into its own table, since the source data isn't shaped that way either.</summary>
    public string? Tags { get; set; }

    public PriorityLevel Priority { get; set; } = PriorityLevel.Medium;
    public TaskStatusType Status { get; set; } = TaskStatusType.Inbox;

    public DateOnly? StartDate { get; set; }
    public DateOnly? DueDate { get; set; }
    public TimeOnly? DueTime { get; set; }
    public DateTimeOffset? CompletedDate { get; set; }

    /// <summary>0–100.</summary>
    public int Progress { get; set; }
    public int? EstimateMinutes { get; set; }
    public EnergyLevel? Energy { get; set; }
    public TaskContextType? Context { get; set; }

    public Guid? GoalId { get; set; }
    public Goals.Goal? Goal { get; set; }

    public RecurringTypeOption RecurringType { get; set; } = RecurringTypeOption.None;

    /// <summary>Self-referencing — the task this one depends on, if any.</summary>
    public Guid? DependencyTaskId { get; set; }
    public TaskItem? DependencyTask { get; set; }

    /// <summary>0–100. Smart Engine output (Phase 29) — column exists now, no compute logic until then.</summary>
    public int? SmartScore { get; set; }

    /// <summary>Smart Engine output (Phase 29).</summary>
    public RiskLevel? Risk { get; set; }

    /// <summary>Smart Engine output (Phase 29).</summary>
    public string? RecommendedAction { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastStatusChangedAt { get; set; }
    public string? Notes { get; set; }
}
