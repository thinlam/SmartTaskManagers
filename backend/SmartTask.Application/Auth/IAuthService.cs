namespace SmartTask.Application.Auth;

public interface IAuthService
{
    /// <summary>Throws InvalidOperationException if the email is already registered.</summary>
    Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);

    /// <summary>Returns null on a wrong email or password — the controller maps that to 401, not a specific "which one was wrong" message (don't leak which part failed).</summary>
    Task<AuthResult?> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);

    /// <summary>Throws InvalidOperationException if the user does not exist.</summary>
    Task UpdateLanguageAsync(Guid userId, string language, CancellationToken cancellationToken);

    /// <summary>Throws InvalidOperationException if the user does not exist.</summary>
    Task UpdateThemeAsync(Guid userId, string theme, CancellationToken cancellationToken);
}
