using SmartTask.Domain.Auth;

namespace SmartTask.Application.Auth;

/// <summary>Application depends on this; SmartTask.Persistence implements it against AppDbContext.</summary>
public interface ISessionRepository
{
    /// <summary>Tracked (not AsNoTracking) — the current-user middleware mutates LastActiveAt on the result and saves it.</summary>
    Task<Session?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Non-revoked, non-expired sessions for the current user (scoped by AppDbContext's global query filter — no userId parameter needed, same as every other GetAllAsync in this app).</summary>
    Task<List<Session>> GetActiveAsync(CancellationToken cancellationToken = default);

    Task AddAsync(Session session, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
