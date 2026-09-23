using SmartTask.Domain.Common;
using SmartTask.Domain.Enums;

namespace SmartTask.Domain.Goals;

/// <summary>
/// Matches GOAL_HEADERS in apps/google-sheets/src/00_Constants.gs.
/// Progress/Status are plain user-set fields here too, same as the
/// frontend's Goal (Phase 14) — Sheets' own createGoal_() only ever
/// defaults them, there's no computed-metrics engine to mirror server-
/// side either.
/// </summary>
public sealed class Goal : SyncableEntity
{
    /// <summary>The account that owns this goal. Set automatically by AppDbContext.SaveChangesAsync on insert — never set this directly.</summary>
    public Guid UserId { get; set; }

    public required string Name { get; set; }
    public AreaType Area { get; set; }
    public DateOnly? TargetDate { get; set; }

    /// <summary>0–100, entered directly.</summary>
    public int Progress { get; set; }
    public GoalStatusType Status { get; set; } = GoalStatusType.OnTrack;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
