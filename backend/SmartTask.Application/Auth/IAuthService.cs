namespace SmartTask.Application.Auth;

public interface IAuthService
{
    /// <summary>Throws InvalidOperationException if the email is already registered.</summary>
    Task<AuthResult> RegisterAsync(
        RegisterRequest request,
        string deviceLabel,
        string? ipAddress,
        CancellationToken cancellationToken = default
    );

    /// <summary>Returns null on a wrong email or password — the controller maps that to 401, not a specific "which one was wrong" message (don't leak which part failed).</summary>
    Task<AuthResult?> LoginAsync(
        LoginRequest request,
        string deviceLabel,
        string? ipAddress,
        CancellationToken cancellationToken = default
    );

    /// <summary>Throws InvalidOperationException if the user does not exist.</summary>
    Task UpdateLanguageAsync(Guid userId, string language, CancellationToken cancellationToken);

    /// <summary>Throws InvalidOperationException if the user does not exist.</summary>
    Task UpdateThemeAsync(Guid userId, string theme, CancellationToken cancellationToken);

    /// <summary>Throws InvalidOperationException if the user does not exist.</summary>
    Task UpdateAvatarAsync(
        Guid userId,
        string avatarBase64,
        string contentType,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Throws InvalidOperationException if the user does not exist,
    /// UnauthorizedAccessException if currentPassword is wrong. On
    /// success, revokes every OTHER session for this user (not
    /// currentSessionId) — a password change is a security-relevant
    /// event other devices should have to re-authenticate for.
    /// </summary>
    Task ChangePasswordAsync(
        Guid userId,
        Guid currentSessionId,
        string currentPassword,
        string newPassword,
        CancellationToken cancellationToken
    );

    /// <summary>Non-revoked, non-expired sessions for the calling user (scoped by AppDbContext's query filter), newest-active first.</summary>
    Task<List<SessionSummary>> GetSessionsAsync(Guid currentSessionId, CancellationToken cancellationToken);

    /// <summary>Throws InvalidOperationException if the session doesn't exist or doesn't belong to the caller (the query filter makes those indistinguishable, same as every other entity in this app).</summary>
    Task RevokeSessionAsync(Guid sessionToRevokeId, CancellationToken cancellationToken);

    /// <summary>Revokes every non-revoked session for the caller except currentSessionId.</summary>
    Task RevokeOtherSessionsAsync(Guid currentSessionId, CancellationToken cancellationToken);

    /// <summary>Revokes exactly this one session — used by POST /logout.</summary>
    Task LogoutAsync(Guid sessionId, CancellationToken cancellationToken);
}
