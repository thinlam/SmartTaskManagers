using System.ComponentModel.DataAnnotations;

namespace SmartTask.Application.Tasks;

public sealed record TaskAreaResponse(
    Guid Id,
    string NameVi,
    string NameEn,
    bool IsSystem,
    int SortOrder,
    int TaskCount
);

public sealed class CreateTaskAreaRequest
{
    [Required]
    [MaxLength(100)]
    public required string NameVi { get; init; }

    /// <summary>Empty/omitted falls back to NameVi — "trống thì dùng tên Việt cho cả hai" (brief).</summary>
    [MaxLength(100)]
    public string? NameEn { get; init; }
}

public sealed class RenameTaskAreaRequest
{
    [Required]
    [MaxLength(100)]
    public required string NameVi { get; init; }

    [MaxLength(100)]
    public string? NameEn { get; init; }
}

/// <summary>Only required when the area being deleted still has tasks pointing at it.</summary>
public sealed class DeleteTaskAreaRequest
{
    public Guid? ReplacementAreaId { get; init; }
}
