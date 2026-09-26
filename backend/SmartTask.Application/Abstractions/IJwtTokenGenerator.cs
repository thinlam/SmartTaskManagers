namespace SmartTask.Application.Abstractions;

public sealed record JwtToken(string Value, DateTimeOffset ExpiresAt);

/// <summary>Application depends on this; Infrastructure implements it (reads the signing secret from user-secrets, never committed — see SmartTask.Api/README or the Phase 22 notes in backend/README.md).</summary>
public interface IJwtTokenGenerator
{
    JwtToken GenerateToken(Guid userId, string email, Guid sessionId);
}
