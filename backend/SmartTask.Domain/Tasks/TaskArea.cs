using SmartTask.Domain.Common;

namespace SmartTask.Domain.Tasks;

/// <summary>
/// "Lĩnh vực" for a Task — bilingual, user-extensible, and deliberately a separate table from
/// Project's ProjectFieldType enum (different concept, different name, no overlap). Replaces the
/// old hardcoded AreaType enum as the live source of truth; TaskItem.Area (AreaType) stays as a
/// read-only historical column for rollback safety, same pattern as LegacyTagsCsv.
/// System rows (IsSystem=true, UserId=null) are seeded once by migration and shared by every
/// account — never editable/deletable. A user's own custom rows (IsSystem=false) carry their
/// UserId and can be renamed or deleted (DeleteAsync requires a replacement area for any task
/// still pointing at the one being deleted).
/// </summary>
public sealed class TaskArea : Entity
{
    /// <summary>Null for system rows (shared by every account); set for a user's own custom area.</summary>
    public Guid? UserId { get; set; }

    /// <summary>Stable machine key (e.g. "career") — only meaningful for system rows; a custom area's key is its own new Guid-derived slug, never read by code.</summary>
    public required string Key { get; set; }

    public required string NameVi { get; set; }
    public required string NameEn { get; set; }
    public bool IsSystem { get; set; }
    public int SortOrder { get; set; }

    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
