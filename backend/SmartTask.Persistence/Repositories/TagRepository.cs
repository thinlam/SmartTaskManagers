using Microsoft.EntityFrameworkCore;
using SmartTask.Application.Tags;
using SmartTask.Domain.Tasks;

namespace SmartTask.Persistence.Repositories;

public sealed class TagRepository(AppDbContext dbContext) : ITagRepository
{
    public Task<List<Tag>> GetAllAsync(CancellationToken cancellationToken = default) =>
        dbContext.Tags.Include(t => t.Tasks).OrderBy(t => t.Name).ToListAsync(cancellationToken);

    public Task<Tag?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        dbContext.Tags.Include(t => t.Tasks).FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

    public async Task<List<Tag>> GetOrCreateManyAsync(
        IEnumerable<string> names,
        CancellationToken cancellationToken = default
    )
    {
        var normalizedToOriginal = names
            .Select(n => n.Trim())
            .Where(n => n.Length > 0)
            .GroupBy(n => n.ToLowerInvariant())
            .ToDictionary(g => g.Key, g => g.First());

        if (normalizedToOriginal.Count == 0)
        {
            return [];
        }

        var normalizedKeys = normalizedToOriginal.Keys.ToList();
        var existing = await dbContext
            .Tags.Where(t => normalizedKeys.Contains(t.NormalizedName))
            .ToListAsync(cancellationToken);

        var result = new List<Tag>(existing);
        foreach (var normalized in normalizedKeys)
        {
            if (existing.Any(t => t.NormalizedName == normalized))
            {
                continue;
            }

            var created = new Tag
            {
                Name = normalizedToOriginal[normalized],
                NormalizedName = normalized,
            };
            dbContext.Tags.Add(created);
            result.Add(created);
        }

        return result;
    }

    public void Remove(Tag tag) => dbContext.Tags.Remove(tag);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
