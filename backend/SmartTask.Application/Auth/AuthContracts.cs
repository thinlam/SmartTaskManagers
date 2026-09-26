namespace SmartTask.Application.Auth;

public sealed record RegisterRequest(string Email, string Password, string? DisplayName);

public sealed record LoginRequest(string Email, string Password);

public sealed record AuthResult(
    Guid UserId,
    string Email,
    string Token,
    DateTimeOffset ExpiresAt,
    string Language,
    string Theme,
    string? AvatarDataUrl
);

public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public sealed record UpdateAvatarRequest(string AvatarBase64, string ContentType);

public sealed record SessionSummary(
    Guid Id,
    string DeviceLabel,
    string? IpAddress,
    DateTimeOffset CreatedAt,
    DateTimeOffset LastActiveAt,
    bool IsCurrent
);
