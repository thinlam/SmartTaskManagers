namespace SmartTask.Application.Tags;

public interface ITagService
{
    Task<List<TagResponse>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>Null if no tag with this id exists (for the current user).</summary>
    Task<TagResponse?> RenameAsync(
        Guid id,
        RenameTagRequest request,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Moves every task tagged with SourceTagId onto TargetTagId, then deletes the source tag.
    /// Null if either id doesn't exist; throws TagValidationException if they're the same id.
    /// </summary>
    Task<TagResponse?> MergeAsync(
        MergeTagsRequest request,
        CancellationToken cancellationToken = default
    );

    /// <summary>Deletes the tag — only unlinks it from tasks (TaskTags rows), never touches the tasks themselves. False if no tag with this id exists.</summary>
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
