namespace SmartTask.Application.Abstractions;

/// <summary>Application depends on this; Infrastructure implements it with ASP.NET Core Identity's PasswordHasher&lt;T&gt; (PBKDF2, not a hand-rolled scheme).</summary>
public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string passwordHash, string providedPassword);
}
