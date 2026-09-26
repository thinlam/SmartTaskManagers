using SmartTask.Application.Abstractions;
using SmartTask.Application.Users;
using SmartTask.Domain.Auth;
using SmartTask.Domain.Users;

namespace SmartTask.Application.Auth;

/// <summary>
/// The use case itself — lives in Application, not Infrastructure,
/// because it only orchestrates through abstractions (IUserRepository/
/// IPasswordHasher/IJwtTokenGenerator/ISessionRepository), never a
/// concrete EF Core or JWT library type.
/// </summary>
public sealed class AuthService(
    IUserRepository userRepository,
    IPasswordHasher passwordHasher,
    IJwtTokenGenerator tokenGenerator,
    ISessionRepository sessionRepository,
    IDateTimeProvider dateTimeProvider
) : IAuthService
{
    public async Task<AuthResult> RegisterAsync(
        RegisterRequest request,
        string deviceLabel,
        string? ipAddress,
        CancellationToken cancellationToken = default
    )
    {
        var existing = await userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (existing is not null)
        {
            throw new InvalidOperationException("A user with this email already exists.");
        }

        var user = new User
        {
            Email = request.Email,
            PasswordHash = passwordHasher.Hash(request.Password),
            DisplayName = request.DisplayName,
        };

        await userRepository.AddAsync(user, cancellationToken);
        await userRepository.SaveChangesAsync(cancellationToken);

        return await BuildAuthResultAsync(user, deviceLabel, ipAddress, cancellationToken);
    }

    public async Task<AuthResult?> LoginAsync(
        LoginRequest request,
        string deviceLabel,
        string? ipAddress,
        CancellationToken cancellationToken = default
    )
    {
        var user = await userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (user is null || !passwordHasher.Verify(user.PasswordHash, request.Password))
        {
            return null;
        }

        return await BuildAuthResultAsync(user, deviceLabel, ipAddress, cancellationToken);
    }

    /// <summary>
    /// Creates the Session row and the JWT together, using the
    /// Session's own (already-generated) Id as the token's jti — this
    /// is the link the current-user middleware uses to revoke a live
    /// token early. The Session is added/saved BEFORE the token is
    /// handed back, so a session-validation check on the very next
    /// request always finds the row.
    /// </summary>
    private async Task<AuthResult> BuildAuthResultAsync(
        User user,
        string deviceLabel,
        string? ipAddress,
        CancellationToken cancellationToken
    )
    {
        var session = new Session
        {
            UserId = user.Id,
            DeviceLabel = deviceLabel,
            IpAddress = ipAddress,
        };

        var token = tokenGenerator.GenerateToken(user.Id, user.Email, session.Id);
        session.ExpiresAt = token.ExpiresAt;

        await sessionRepository.AddAsync(session, cancellationToken);
        await sessionRepository.SaveChangesAsync(cancellationToken);

        return new AuthResult(
            user.Id,
            user.Email,
            token.Value,
            token.ExpiresAt,
            user.Language,
            user.Theme,
            BuildAvatarDataUrl(user)
        );
    }

    private static string? BuildAvatarDataUrl(User user) =>
        user.AvatarData is not null && user.AvatarContentType is not null
            ? $"data:{user.AvatarContentType};base64,{Convert.ToBase64String(user.AvatarData)}"
            : null;

    public async Task UpdateLanguageAsync(Guid userId, string language, CancellationToken cancellationToken)
    {
        var user =
            await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");
        user.Language = language;
        await userRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateThemeAsync(Guid userId, string theme, CancellationToken cancellationToken)
    {
        var user =
            await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");
        user.Theme = theme;
        await userRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAvatarAsync(
        Guid userId,
        string avatarBase64,
        string contentType,
        CancellationToken cancellationToken
    )
    {
        var user =
            await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");
        user.AvatarData = Convert.FromBase64String(avatarBase64);
        user.AvatarContentType = contentType;
        await userRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task ChangePasswordAsync(
        Guid userId,
        Guid currentSessionId,
        string currentPassword,
        string newPassword,
        CancellationToken cancellationToken
    )
    {
        var user =
            await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        if (!passwordHasher.Verify(user.PasswordHash, currentPassword))
        {
            throw new UnauthorizedAccessException("Current password is incorrect.");
        }

        user.PasswordHash = passwordHasher.Hash(newPassword);

        var activeSessions = await sessionRepository.GetActiveAsync(cancellationToken);
        foreach (var session in activeSessions.Where(s => s.Id != currentSessionId))
        {
            var tracked =
                await sessionRepository.GetByIdAsync(session.Id, cancellationToken)
                ?? throw new InvalidOperationException("Session disappeared mid-revoke.");
            tracked.RevokedAt = dateTimeProvider.UtcNow;
        }

        // One SaveChangesAsync call persists both the password change and
        // every session revocation above — they're all tracked by the
        // same underlying AppDbContext instance (userRepository and
        // sessionRepository both wrap the one scoped DbContext for this
        // request).
        await userRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<SessionSummary>> GetSessionsAsync(
        Guid currentSessionId,
        CancellationToken cancellationToken
    )
    {
        var sessions = await sessionRepository.GetActiveAsync(cancellationToken);
        return sessions
            .OrderByDescending(s => s.LastActiveAt)
            .Select(s => new SessionSummary(
                s.Id,
                s.DeviceLabel,
                s.IpAddress,
                s.CreatedAt,
                s.LastActiveAt,
                s.Id == currentSessionId
            ))
            .ToList();
    }

    public async Task RevokeSessionAsync(Guid sessionToRevokeId, CancellationToken cancellationToken)
    {
        var session =
            await sessionRepository.GetByIdAsync(sessionToRevokeId, cancellationToken)
            ?? throw new InvalidOperationException("Session not found.");
        session.RevokedAt = dateTimeProvider.UtcNow;
        await sessionRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task RevokeOtherSessionsAsync(Guid currentSessionId, CancellationToken cancellationToken)
    {
        var activeSessions = await sessionRepository.GetActiveAsync(cancellationToken);
        foreach (var summary in activeSessions.Where(s => s.Id != currentSessionId))
        {
            var tracked =
                await sessionRepository.GetByIdAsync(summary.Id, cancellationToken)
                ?? throw new InvalidOperationException("Session disappeared mid-revoke.");
            tracked.RevokedAt = dateTimeProvider.UtcNow;
        }
        await sessionRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task LogoutAsync(Guid sessionId, CancellationToken cancellationToken)
    {
        var session = await sessionRepository.GetByIdAsync(sessionId, cancellationToken);
        if (session is null)
        {
            return; // Already gone/revoked — logging out is idempotent.
        }
        session.RevokedAt = dateTimeProvider.UtcNow;
        await sessionRepository.SaveChangesAsync(cancellationToken);
    }
}
