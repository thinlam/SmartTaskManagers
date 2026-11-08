using System.ComponentModel.DataAnnotations;

namespace SmartTask.Application.Tags;

public sealed record TagResponse(Guid Id, string Name, int TaskCount);

public sealed class RenameTagRequest
{
    [Required]
    [MaxLength(30)]
    public required string Name { get; init; }
}

public sealed class MergeTagsRequest
{
    public required Guid SourceTagId { get; init; }
    public required Guid TargetTagId { get; init; }
}
