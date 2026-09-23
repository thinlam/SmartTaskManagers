using SmartTask.Application.Abstractions;

namespace SmartTask.Infrastructure.Security;

/// <summary>
/// Plain mutable holder, no dependencies — Program.cs's middleware sets
/// it once per HTTP request from the JWT claim; the two hosted services
/// set it manually once per user per loop iteration inside their own
/// per-user DI scope. Registered Scoped so each request/scope gets its
/// own instance (see DependencyInjection.cs).
/// </summary>
public sealed class CurrentUserContext : ICurrentUserContext
{
    public Guid? UserId { get; set; }
}
