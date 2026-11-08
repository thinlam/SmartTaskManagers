namespace SmartTask.Application.Tags;

public sealed class TagService(ITagRepository tagRepository) : ITagService
{
    public async Task<List<TagResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var tags = await tagRepository.GetAllAsync(cancellationToken);
        return tags.Select(ToResponse).ToList();
    }

    public async Task<TagResponse?> RenameAsync(
        Guid id,
        RenameTagRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var tag = await tagRepository.GetByIdAsync(id, cancellationToken);
        if (tag is null)
        {
            return null;
        }

        var name = request.Name.Trim();
        if (name.Length == 0)
        {
            throw TagValidationException.ForField("Name", "Tên thẻ không được để trống.");
        }
        if (name.Length > 30)
        {
            throw TagValidationException.ForField("Name", "Tên thẻ tối đa 30 ký tự.");
        }

        tag.Name = name;
        tag.NormalizedName = name.ToLowerInvariant();
        await tagRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(tag);
    }

    public async Task<TagResponse?> MergeAsync(
        MergeTagsRequest request,
        CancellationToken cancellationToken = default
    )
    {
        if (request.SourceTagId == request.TargetTagId)
        {
            throw TagValidationException.ForField("TargetTagId", "Không thể gộp một thẻ với chính nó.");
        }

        var source = await tagRepository.GetByIdAsync(request.SourceTagId, cancellationToken);
        var target = await tagRepository.GetByIdAsync(request.TargetTagId, cancellationToken);
        if (source is null || target is null)
        {
            return null;
        }

        // Move every task off the source tag; skip tasks that already carry the target tag
        // too, so merging never creates a duplicate task<->tag link. Updates both sides of the
        // skip navigation explicitly rather than relying on EF's change-tracker fixup to infer
        // the reverse side, so TagResponse.TaskCount below is correct immediately.
        foreach (var task in source.Tasks.ToList())
        {
            task.Tags.Remove(source);
            if (!task.Tags.Contains(target))
            {
                task.Tags.Add(target);
                target.Tasks.Add(task);
            }
        }

        source.Tasks.Clear();
        tagRepository.Remove(source);
        await tagRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(target);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var tag = await tagRepository.GetByIdAsync(id, cancellationToken);
        if (tag is null)
        {
            return false;
        }

        // Only unlinks the tag from its tasks (clearing the skip-navigation collection empties
        // the TaskTags join rows) — the tasks themselves are never touched. Updates both sides
        // explicitly so each task's own Tags collection reflects the unlink immediately.
        foreach (var task in tag.Tasks.ToList())
        {
            task.Tags.Remove(tag);
        }
        tag.Tasks.Clear();
        tagRepository.Remove(tag);
        await tagRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static TagResponse ToResponse(Domain.Tasks.Tag tag) =>
        new(tag.Id, tag.Name, tag.Tasks.Count);
}
