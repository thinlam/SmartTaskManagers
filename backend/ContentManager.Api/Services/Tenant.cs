using System.Security.Claims;

namespace ContentManager.Api.Services;

/// <summary>The workspace of the signed-in caller; Guid.Empty when anonymous (login, seeding).</summary>
public interface ITenant
{
    Guid WorkspaceId { get; }
}

public class HttpTenant(IHttpContextAccessor http) : ITenant
{
    public const string ClaimType = "ws";

    public Guid WorkspaceId =>
        Guid.TryParse(http.HttpContext?.User.FindFirstValue(ClaimType), out var id) ? id : Guid.Empty;
}
