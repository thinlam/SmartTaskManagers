using SmartTask.Domain.Common;

namespace SmartTask.Domain.Auth;

/// <summary>
/// One issued JWT = one Session row, with the same id (see
/// JwtTokenGenerator.GenerateToken's sessionId parameter and
/// AuthService's login/register flow) — this is what lets a normally
/// stateless JWT be revoked early: the current-user middleware
/// (Program.cs) looks up this row by the token's own `jti` claim on
/// every authenticated request and rejects it if RevokedAt is set.
/// ExpiresAt mirrors the JWT's own expiry — used only to hide
/// naturally-stale rows from the Active Sessions list; the JWT's own
/// signature/expiry check (already in place) is what actually rejects
/// an expired token before this row is even looked at.
/// </summary>
public sealed class Session : Entity
{
    public Guid UserId { get; set; }
    public required string DeviceLabel { get; set; }
    public string? IpAddress { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastActiveAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
}
