using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTask.Application.Abstractions;
using SmartTask.Application.Auth;

namespace SmartTask.Api.Controllers;

public sealed record AuthResponse(
    Guid UserId,
    string Email,
    string Token,
    DateTimeOffset ExpiresAt,
    string Language,
    string Theme,
    string? AvatarDataUrl
);

public sealed record UpdateLanguageRequest(string Language);

public sealed record UpdateThemeRequest(string Theme);

public sealed record SessionResponse(
    Guid Id,
    string DeviceLabel,
    string? IpAddress,
    DateTimeOffset CreatedAt,
    DateTimeOffset LastActiveAt,
    bool IsCurrent
);

/// <summary>
/// The real vertical slice for Phase 22, same idea as HealthController in
/// Phase 20: register → login → call a protected endpoint with the
/// issued Bearer token proves JwtBearer validation, DI, and the
/// Application/Infrastructure/Persistence split all actually work
/// together, not just "the code compiles."
/// </summary>
[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthService authService, ICurrentUserContext currentUserContext)
    : ControllerBase
{
    /// <summary>
    /// Min 8 chars, at least one lowercase, one uppercase, one digit — matches
    /// the client-side rules shown on the Register form's live checklist.
    /// Checked here (not in AuthService) to match this controller's existing
    /// pattern of validating request shape before calling the service, same
    /// as UpdateLanguage/UpdateTheme's allowed-value checks below.
    /// </summary>
    private static readonly Regex PasswordPolicy = new(
        @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$",
        RegexOptions.Compiled
    );

    private static readonly string[] AllowedAvatarContentTypes = ["image/jpeg", "image/png", "image/webp"];
    private const int MaxAvatarBytes = 1_500_000;

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken
    )
    {
        if (!PasswordPolicy.IsMatch(request.Password))
        {
            return BadRequest(
                new
                {
                    message = "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.",
                }
            );
        }

        try
        {
            var result = await authService.RegisterAsync(
                request,
                DeviceLabelParser.Parse(Request.Headers["User-Agent"].ToString()),
                GetClientIpAddress(),
                cancellationToken
            );
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
        var result = await authService.LoginAsync(
            request,
            DeviceLabelParser.Parse(Request.Headers["User-Agent"].ToString()),
            GetClientIpAddress(),
            cancellationToken
        );
        if (result is null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        return Ok(ToResponse(result));
    }

    [Authorize]
    [HttpPatch("language")]
    public async Task<IActionResult> UpdateLanguage(
        UpdateLanguageRequest request,
        CancellationToken cancellationToken
    )
    {
        if (request.Language is not ("vi" or "en"))
        {
            return BadRequest(new { message = "Language must be 'vi' or 'en'." });
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var parsedUserId))
        {
            return Unauthorized();
        }

        try
        {
            await authService.UpdateLanguageAsync(parsedUserId, request.Language, cancellationToken);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }

        return NoContent();
    }

    [Authorize]
    [HttpPatch("theme")]
    public async Task<IActionResult> UpdateTheme(
        UpdateThemeRequest request,
        CancellationToken cancellationToken
    )
    {
        if (request.Theme is not ("light" or "dark"))
        {
            return BadRequest(new { message = "Theme must be 'light' or 'dark'." });
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var parsedUserId))
        {
            return Unauthorized();
        }

        try
        {
            await authService.UpdateThemeAsync(parsedUserId, request.Theme, cancellationToken);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }

        return NoContent();
    }

    [Authorize]
    [HttpPatch("avatar")]
    public async Task<IActionResult> UpdateAvatar(
        UpdateAvatarRequest request,
        CancellationToken cancellationToken
    )
    {
        if (!AllowedAvatarContentTypes.Contains(request.ContentType))
        {
            return BadRequest(
                new { message = "Avatar must be image/jpeg, image/png, or image/webp." }
            );
        }

        byte[] decoded;
        try
        {
            decoded = Convert.FromBase64String(request.AvatarBase64);
        }
        catch (FormatException)
        {
            return BadRequest(new { message = "avatarBase64 is not valid base64." });
        }

        if (decoded.Length > MaxAvatarBytes)
        {
            return BadRequest(new { message = $"Avatar must be under {MaxAvatarBytes} bytes." });
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var parsedUserId))
        {
            return Unauthorized();
        }

        try
        {
            await authService.UpdateAvatarAsync(
                parsedUserId,
                request.AvatarBase64,
                request.ContentType,
                cancellationToken
            );
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }

        return NoContent();
    }

    [Authorize]
    [HttpPatch("password")]
    public async Task<IActionResult> ChangePassword(
        ChangePasswordRequest request,
        CancellationToken cancellationToken
    )
    {
        if (!PasswordPolicy.IsMatch(request.NewPassword))
        {
            return BadRequest(
                new
                {
                    message = "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.",
                }
            );
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var parsedUserId) || currentUserContext.SessionId is not { } sessionId)
        {
            return Unauthorized();
        }

        try
        {
            await authService.ChangePasswordAsync(
                parsedUserId,
                sessionId,
                request.CurrentPassword,
                request.NewPassword,
                cancellationToken
            );
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }

        return NoContent();
    }

    [Authorize]
    [HttpGet("sessions")]
    public async Task<ActionResult<List<SessionResponse>>> GetSessions(CancellationToken cancellationToken)
    {
        if (currentUserContext.SessionId is not { } sessionId)
        {
            return Unauthorized();
        }

        var sessions = await authService.GetSessionsAsync(sessionId, cancellationToken);
        return Ok(
            sessions
                .Select(s => new SessionResponse(
                    s.Id,
                    s.DeviceLabel,
                    s.IpAddress,
                    s.CreatedAt,
                    s.LastActiveAt,
                    s.IsCurrent
                ))
                .ToList()
        );
    }

    [Authorize]
    [HttpDelete("sessions/{id:guid}")]
    public async Task<IActionResult> RevokeSession(Guid id, CancellationToken cancellationToken)
    {
        if (currentUserContext.SessionId == id)
        {
            return BadRequest(new { message = "Sign out to end your own session." });
        }

        try
        {
            await authService.RevokeSessionAsync(id, cancellationToken);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }

        return NoContent();
    }

    [Authorize]
    [HttpPost("sessions/revoke-others")]
    public async Task<IActionResult> RevokeOtherSessions(CancellationToken cancellationToken)
    {
        if (currentUserContext.SessionId is not { } sessionId)
        {
            return Unauthorized();
        }

        await authService.RevokeOtherSessionsAsync(sessionId, cancellationToken);
        return NoContent();
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        if (currentUserContext.SessionId is { } sessionId)
        {
            await authService.LogoutAsync(sessionId, cancellationToken);
        }

        return NoContent();
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

    /// <summary>
    /// Railway terminates TLS and proxies over HTTP, so
    /// HttpContext.Connection.RemoteIpAddress is Railway's internal
    /// address, not the real client's — X-Forwarded-For (set by
    /// Railway's edge) has the real one when present.
    /// </summary>
    private string? GetClientIpAddress()
    {
        var forwardedFor = Request.Headers["X-Forwarded-For"].ToString();
        if (!string.IsNullOrWhiteSpace(forwardedFor))
        {
            return forwardedFor.Split(',')[0].Trim();
        }
        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }

    private static AuthResponse ToResponse(AuthResult result) =>
        new(
            result.UserId,
            result.Email,
            result.Token,
            result.ExpiresAt,
            result.Language,
            result.Theme,
            result.AvatarDataUrl
        );
}
