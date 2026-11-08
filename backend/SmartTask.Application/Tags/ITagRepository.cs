using SmartTask.Domain.Tasks;

namespace SmartTask.Application.Tags;

/// <summary>Application depends on this; SmartTask.Persistence implements it against AppDbContext.</summary>
public interface ITagRepository
{
    /// <summary>All tags for the current user, alphabetical — backs both the autocomplete and the management screen.</summary>
    Task<List<Tag>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<Tag?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Finds each name's existing Tag by NormalizedName (trim+lowercase), or creates a new one
    /// for the current user — the single entry point TaskService uses so "Work"/"work "/" WORK"
    /// all resolve to the same row instead of three near-duplicates.
    /// </summary>
    Task<List<Tag>> GetOrCreateManyAsync(
        IEnumerable<string> names,
        CancellationToken cancellationToken = default
    );

    void Remove(Tag tag);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
