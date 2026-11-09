using SmartTask.Domain.Common;

namespace SmartTask.Domain.Tasks;

/// <summary>One row per status change on a task — audit trail for "ai/khi nào đổi trạng thái" (GĐ redesign, 2026-11-09). No UI reads this yet; it exists so a future activity feed has data from day one.</summary>
public sealed class TaskActivityLog : Entity
{
    public Guid UserId { get; set; }
    public Guid TaskId { get; set; }
    public TaskItem? Task { get; set; }

    /// <summary>e.g. "status_changed".</summary>
    public required string Action { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public DateTimeOffset At { get; set; } = DateTimeOffset.UtcNow;
}
