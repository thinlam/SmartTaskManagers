namespace SmartTask.Domain.Common;

/// <summary>
/// Adds the sync columns docs/architecture/ARCHITECTURE.md calls for
/// ("cột đồng bộ: Id UUID, SyncStatus, LastSyncedAt, Version") on top of
/// Entity's Id — added now, in Phase 21, specifically so Phase 28's sync
/// work doesn't force a schema migration on every synced table. Every
/// entity that will eventually round-trip with Google Sheets (Task,
/// Project, Goal, Habit) derives from this, not Entity directly.
/// </summary>
public abstract class SyncableEntity : Entity
{
    public SyncStatus SyncStatus { get; set; } = SyncStatus.NotSynced;
    public DateTimeOffset? LastSyncedAt { get; set; }

    /// <summary>Incremented on every update — optimistic concurrency today, conflict detection once Phase 28 exists.</summary>
    public int Version { get; set; } = 1;
}
