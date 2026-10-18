using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ContentManager.Api.Domain;
using Microsoft.IdentityModel.Tokens;

namespace ContentManager.Api.Services;

public class JwtOptions
{
    public string Secret { get; set; } = "";
    public string Issuer { get; set; } = "ContentManager";
    public string Audience { get; set; } = "ContentManagerClients";
    public int ExpiryHours { get; set; } = 24 * 7;
}

public class TokenService(Microsoft.Extensions.Options.IOptions<JwtOptions> options)
{
    private readonly JwtOptions _o = options.Value;

    public (string Token, DateTime ExpiresAt) Create(User user)
    {
        var expires = DateTime.UtcNow.AddHours(_o.ExpiryHours);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_o.Secret));
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim(HttpTenant.ClaimType, user.WorkspaceId.ToString()),
        };
        var jwt = new JwtSecurityToken(
            _o.Issuer, _o.Audience, claims,
            expires: expires,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return (new JwtSecurityTokenHandler().WriteToken(jwt), expires);
    }
}

public static class UserContext
{
    public static Guid UserId(this ClaimsPrincipal p) =>
        Guid.Parse(p.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
