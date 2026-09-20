namespace SmartTask.Domain.Common;

/// <summary>Column exists now so Phase 28 (Google Sheets ↔ Backend Sync) doesn't need a breaking migration later. No sync logic implemented yet — every row starts NotSynced.</summary>
public enum SyncStatus
{
    NotSynced,
    Synced,
    Conflict,
}
