namespace SmartTask.Application.Abstractions;

/// <summary>
/// The authenticated caller's id for the current DI scope — one HTTP
/// request, or one manually-created scope inside a background service.
/// Application depends on this; Infrastructure implements it.
/// Null means "no user resolved yet" (or a background service scope
/// that hasn't been assigned one) — AppDbContext's query filter treats
/// null as "match nothing," never "match everything," so leaving this
/// unset fails closed.
/// </summary>
public interface ICurrentUserContext
{
    Guid? UserId { get; set; }
    Guid? SessionId { get; set; }
}
