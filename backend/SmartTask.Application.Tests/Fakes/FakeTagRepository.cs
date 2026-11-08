using SmartTask.Application.Tags;
using SmartTask.Domain.Tasks;

namespace SmartTask.Application.Tests.Fakes;

/// <summary>In-memory stand-in for ITagRepository — same find-or-create-by-normalized-name behavior as TagRepository, no EF Core provider needed.</summary>
public sealed class FakeTagRepository : ITagRepository
{
    private readonly List<Tag> items = [];

    public Task<List<Tag>> GetAllAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(items.OrderBy(t => t.Name).ToList());

    public Task<Tag?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(items.FirstOrDefault(t => t.Id == id));

    public Task<List<Tag>> GetOrCreateManyAsync(
        IEnumerable<string> names,
        CancellationToken cancellationToken = default
    )
    {
        var normalizedToOriginal = names
            .Select(n => n.Trim())
            .Where(n => n.Length > 0)
            .GroupBy(n => n.ToLowerInvariant())
            .ToDictionary(g => g.Key, g => g.First());

        var result = new List<Tag>();
        foreach (var (normalized, original) in normalizedToOriginal)
        {
            var existing = items.FirstOrDefault(t => t.NormalizedName == normalized);
            if (existing is not null)
            {
                result.Add(existing);
                continue;
            }

            var created = new Tag { Name = original, NormalizedName = normalized };
            items.Add(created);
            result.Add(created);
        }

        return Task.FromResult(result);
    }

    public void Remove(Tag tag) => items.Remove(tag);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}
