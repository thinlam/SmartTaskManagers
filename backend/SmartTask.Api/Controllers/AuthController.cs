using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTask.Application.Auth;

namespace SmartTask.Api.Controllers;

public sealed record AuthResponse(Guid UserId, string Email, string Token, DateTimeOffset ExpiresAt);

/// <summary>
/// The real vertical slice for Phase 22, same idea as HealthController in
/// Phase 20: register → login → call a protected endpoint with the
/// issued Bearer token proves JwtBearer validation, DI, and the
/// Application/Infrastructure/Persistence split all actually work
/// together, not just "the code compiles."
/// </summary>
[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var result = await authService.RegisterAsync(request, cancellationToken);
            return Ok(ToResponse(result));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(
        LoginRequest request,
        CancellationToken cancellationToken
    )
    {
        var result = await authService.LoginAsync(request, cancellationToken);
        if (result is null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        return Ok(ToResponse(result));
    }

    /// <summary>Requires a valid Bearer token — proves [Authorize] + the JwtBearer middleware configured in Program.cs actually validate a real token, not just that one gets issued.</summary>
    [Authorize]
    [HttpGet("me")]
    public ActionResult<object> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = User.FindFirstValue(ClaimTypes.Email);
        return Ok(new { userId, email });
    }

    private static AuthResponse ToResponse(AuthResult result) =>
        new(result.UserId, result.Email, result.Token, result.ExpiresAt);
}
