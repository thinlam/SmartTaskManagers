using SmartTask.Application.Abstractions;
using SmartTask.Application.Users;
using SmartTask.Domain.Users;

namespace SmartTask.Application.Auth;

/// <summary>
/// The use case itself — lives in Application, not Infrastructure,
/// because it only orchestrates through abstractions (IUserRepository/
/// IPasswordHasher/IJwtTokenGenerator), never a concrete EF Core or JWT
/// library type. This is what "Application: use case, DTO, validation"
/// in docs/architecture/ARCHITECTURE.md means in practice.
/// </summary>
public sealed class AuthService(
    IUserRepository userRepository,
    IPasswordHasher passwordHasher,
    IJwtTokenGenerator tokenGenerator
) : IAuthService
{
    public async Task<AuthResult> RegisterAsync(
        RegisterRequest request,
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

        return BuildAuthResult(user);
    }

    public async Task<AuthResult?> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var user = await userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (user is null || !passwordHasher.Verify(user.PasswordHash, request.Password))
        {
            return null;
        }

        return BuildAuthResult(user);
    }

    private AuthResult BuildAuthResult(User user)
    {
        var token = tokenGenerator.GenerateToken(user.Id, user.Email);
        return new AuthResult(user.Id, user.Email, token.Value, token.ExpiresAt, user.Language, user.Theme);
    }

    public async Task UpdateLanguageAsync(Guid userId, string language, CancellationToken cancellationToken)
    {
        var user = await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");
        user.Language = language;
        await userRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateThemeAsync(Guid userId, string theme, CancellationToken cancellationToken)
    {
        var user = await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");
        user.Theme = theme;
        await userRepository.SaveChangesAsync(cancellationToken);
    }
}
