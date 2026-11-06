using System.ComponentModel.DataAnnotations;
using SmartTask.Domain.Enums;

namespace SmartTask.Application.Projects;

public sealed record ProjectResponse(
    Guid Id,
    string Name,
    AreaType Area,
    ProjectHealthLevel Health,
    DateOnly? TargetDate,
    string? Description,
    ProjectPriorityLevel Priority,
    string Color,
    ProjectFieldType? Field,
    ProjectCategoryType? Category,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

/// <summary>
/// No `Health` field, on either request — same restraint the frontend's
/// ProjectDetailDrawer (Phase 13) already applies: Health is always
/// computed, never entered directly. Here it's stored (see Project's doc
/// comment) but nothing computes it yet, so letting a client set it
/// arbitrarily through the API would contradict "computed" the moment a
/// real compute step (a C# port of computeProjectHealth()) lands.
/// </summary>
public sealed class CreateProjectRequest
{
    [Required]
    [MaxLength(200)]
    public required string Name { get; init; }

    public AreaType Area { get; init; } = AreaType.Personal;
    public DateOnly? TargetDate { get; init; }

    [MaxLength(4000)]
    public string? Description { get; init; }

    public ProjectPriorityLevel Priority { get; init; } = ProjectPriorityLevel.Medium;

    /// <summary>Hex "#RRGGBB"; left null to let ProjectService auto-assign the next palette color.</summary>
    [RegularExpression("^#[0-9A-Fa-f]{6}$")]
    public string? Color { get; init; }

    public ProjectFieldType? Field { get; init; }
    public ProjectCategoryType? Category { get; init; }
}

public sealed class UpdateProjectRequest
{
    [MaxLength(200)]
    public string? Name { get; init; }

    public AreaType? Area { get; init; }
    public DateOnly? TargetDate { get; init; }

    [MaxLength(4000)]
    public string? Description { get; init; }

    public ProjectPriorityLevel? Priority { get; init; }

    [RegularExpression("^#[0-9A-Fa-f]{6}$")]
    public string? Color { get; init; }

    public ProjectFieldType? Field { get; init; }
    public ProjectCategoryType? Category { get; init; }
}
