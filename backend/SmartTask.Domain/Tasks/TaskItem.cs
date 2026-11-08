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

    /// <summary>
    /// Obsolete — the old comma-separated storage (Phase 21), kept so the AddTagsRelational
    /// migration's data backfill has a readable source and so a bad backfill can be re-run
    /// or rolled back without losing the original values. Not read or written by TaskService
    /// anymore; <see cref="Tags"/> below (the Tag/TaskTag relation) is the live source of truth.
    /// Still maps to the DB column literally named "Tags" (see TaskItemConfiguration) — only
    /// the C# property was renamed to free up the `Tags` name for the new navigation.
    /// </summary>
    [Obsolete("Read-only historical data. Use the Tags navigation collection instead.")]
    public string? LegacyTagsCsv { get; set; }

    /// <summary>Many-to-many via the TaskTags join table (see TaskItemConfiguration) — the normalized replacement for LegacyTagsCsv.</summary>
    public ICollection<Tag> Tags { get; set; } = new List<Tag>();

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

    /// <summary>Sort order within the user's task list — set to "end of list" on create, never entered by hand.</summary>
    public int Position { get; set; }

    /// <summary>Soft delete (GĐ1) — replaces the old hard DELETE so Undo can restore. Hidden from every normal query by AppDbContext's global query filter.</summary>
    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    /// <summary>Subtask parent — self-referencing, max depth 2 (enforced in TaskService, not the DB). Null for a top-level task.</summary>
    public Guid? ParentTaskId { get; set; }
    public TaskItem? ParentTask { get; set; }

    /// <summary>When set, the frontend shows an in-app reminder banner/toast once this time passes — no background delivery (no email/push) this phase.</summary>
    public DateTimeOffset? ReminderAt { get; set; }

    /// <summary>A pasted link, not an uploaded file — no file storage exists for this app yet.</summary>
    public string? AttachmentUrl { get; set; }
}
