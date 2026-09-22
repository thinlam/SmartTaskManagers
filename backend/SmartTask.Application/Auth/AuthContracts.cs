namespace SmartTask.Application.Auth;

public sealed record RegisterRequest(string Email, string Password, string? DisplayName);

public sealed record LoginRequest(string Email, string Password);

public sealed record AuthResult(Guid UserId, string Email, string Token, DateTimeOffset ExpiresAt, string Language);
