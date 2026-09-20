namespace SmartTask.Infrastructure.Security;

/// <summary>
/// Bound from the "Jwt" configuration section. `Secret` deliberately has
/// no default — it must come from `dotnet user-secrets` in dev (never
/// appsettings.json, never committed) or a real secret store in
/// production; JwtTokenGenerator throws a clear error if it's missing
/// rather than silently signing tokens with an empty key.
/// </summary>
public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Secret { get; init; } = string.Empty;
    public string Issuer { get; init; } = string.Empty;
    public string Audience { get; init; } = string.Empty;
    public int ExpiryMinutes { get; init; } = 60;
}
