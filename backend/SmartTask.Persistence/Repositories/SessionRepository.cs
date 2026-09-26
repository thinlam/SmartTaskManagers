using Microsoft.EntityFrameworkCore;
using SmartTask.Application.Abstractions;
using SmartTask.Application.Auth;
using SmartTask.Domain.Auth;

namespace SmartTask.Persistence.Repositories;

public sealed class SessionRepository(AppDbContext dbContext, IDateTimeProvider dateTimeProvider) : ISessionRepository
{
    public Task<Session?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        dbContext.Sessions.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

    public Task<List<Session>> GetActiveAsync(CancellationToken cancellationToken = default)
    {
        var now = dateTimeProvider.UtcNow;
        return dbContext
            .Sessions.AsNoTracking()
            .Where(s => s.RevokedAt == null && s.ExpiresAt > now)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Session session, CancellationToken cancellationToken = default) =>
        await dbContext.Sessions.AddAsync(session, cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
