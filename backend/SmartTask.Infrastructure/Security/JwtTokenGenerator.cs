using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SmartTask.Application.Abstractions;

namespace SmartTask.Infrastructure.Security;

/// <summary>
/// Claims use System.Security.Claims.ClaimTypes (NameIdentifier/Email),
/// not the short JWT names (sub/email) — the JwtBearer middleware's
/// default inbound claim mapping already rewrites short names to these
/// same ClaimTypes URIs on the way in, so writing them out this way from
/// the start means AuthController's [Authorize] endpoints read
/// `User.FindFirstValue(ClaimTypes.NameIdentifier)` and get exactly what
/// was issued, no remapping surprises to reason about.
/// </summary>
public sealed class JwtTokenGenerator(IOptions<JwtOptions> options, IDateTimeProvider dateTimeProvider)
    : IJwtTokenGenerator
{
    public JwtToken GenerateToken(Guid userId, string email, Guid sessionId)
    {
        var jwtOptions = options.Value;
        if (string.IsNullOrWhiteSpace(jwtOptions.Secret))
        {
            throw new InvalidOperationException(
                "Missing 'Jwt:Secret'. Set it with `dotnet user-secrets set \"Jwt:Secret\" \"<value>\"` "
                    + "inside SmartTask.Api — never put a real signing secret in appsettings.json."
            );
        }

        var expiresAt = dateTimeProvider.UtcNow.AddMinutes(jwtOptions.ExpiryMinutes);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(JwtRegisteredClaimNames.Jti, sessionId.ToString()),
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Secret));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: jwtOptions.Issuer,
            audience: jwtOptions.Audience,
            claims: claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials
        );

        var value = new JwtSecurityTokenHandler().WriteToken(token);
        return new JwtToken(value, expiresAt);
    }
}
