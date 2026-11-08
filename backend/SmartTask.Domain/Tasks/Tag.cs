using SmartTask.Domain.Common;

namespace SmartTask.Domain.Tasks;

/// <summary>
/// A per-user tag, normalized out of TaskItem's old comma-separated
/// `Tags` string (kept on TaskItem as `LegacyTagsCsv` for rollback safety —
/// see the AddTagsRelational migration's data backfill). Two tags with the
/// same <see cref="NormalizedName"/> for the same user are the same tag —
/// enforced by a unique index, not just app-level checks, so a race between
/// two requests creating "Work" and "work" at once can't produce duplicates.
/// </summary>
public sealed class Tag : Entity
{
    public Guid UserId { get; set; }

    public required string Name { get; set; }

    /// <summary>Trimmed + lowercased <see cref="Name"/> — the actual uniqueness/lookup key, since tag matching is case-insensitive.</summary>
    public required string NormalizedName { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
