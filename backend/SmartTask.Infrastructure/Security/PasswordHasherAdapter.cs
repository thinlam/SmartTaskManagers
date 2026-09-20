using Microsoft.AspNetCore.Identity;
using SmartTask.Application.Abstractions;
using SmartTask.Domain.Users;

namespace SmartTask.Infrastructure.Security;

/// <summary>
/// Wraps ASP.NET Core Identity's PasswordHasher&lt;TUser&gt; (PBKDF2 with
/// a random salt per hash) instead of hand-rolling one — this is the one
/// piece of Microsoft.Extensions.Identity.Core actually used; full
/// ASP.NET Core Identity (its own DbContext, stores, sign-in manager) is
/// deliberately not pulled in, since a lean custom User + JWT flow fits
/// "Personal Mode" better than adopting a framework built for
/// multi-tenant/team auth.
/// </summary>
public sealed class PasswordHasherAdapter : IPasswordHasher
{
    private readonly PasswordHasher<User> _hasher = new();

    // PasswordHasher<TUser>'s `user` parameter only exists so a custom
    // subclass could incorporate user-specific data into the hash — the
    // default implementation never reads it, so passing null! here is
    // safe and standard for this exact case.
    public string Hash(string password) => _hasher.HashPassword(null!, password);

    public bool Verify(string passwordHash, string providedPassword)
    {
        var result = _hasher.VerifyHashedPassword(null!, passwordHash, providedPassword);
        return result is PasswordVerificationResult.Success
            or PasswordVerificationResult.SuccessRehashNeeded;
    }
}
