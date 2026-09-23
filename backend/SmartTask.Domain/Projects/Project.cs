using SmartTask.Domain.Common;
using SmartTask.Domain.Enums;

namespace SmartTask.Domain.Projects;

/// <summary>
/// Matches PROJECT_HEADERS in apps/google-sheets/src/00_Constants.gs,
/// including `Health` — unlike packages/types's frontend Project (Phase
/// 13), which deliberately never stores Health because the desktop demo
/// store has no background job to keep a cached value fresh. A real
/// backend can legitimately cache Health server-side and refresh it on
/// write; that refresh logic isn't implemented yet (no C# port of
/// computeProjectHealth() from packages/shared exists yet — that lands
/// once the Projects API, Phase 24, actually writes to this column).
/// Health defaults to Healthy and is otherwise inert this phase.
/// </summary>
public sealed class Project : SyncableEntity
{
    /// <summary>The account that owns this project. Set automatically by AppDbContext.SaveChangesAsync on insert — never set this directly.</summary>
    public Guid UserId { get; set; }

    public required string Name { get; set; }
    public AreaType Area { get; set; }
    public ProjectHealthLevel Health { get; set; } = ProjectHealthLevel.Healthy;
    public DateOnly? TargetDate { get; set; }
    public string? Description { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
