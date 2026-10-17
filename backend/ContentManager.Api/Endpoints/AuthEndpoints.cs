using ContentManager.Api.Data;
using ContentManager.Api.Domain;
using ContentManager.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace ContentManager.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuth(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/auth");

        g.MapPost("/register", async (RegisterInput i, AppDbContext db, TokenService tokens) =>
        {
            var email = i.Email?.Trim().ToLowerInvariant() ?? "";
            if (!email.Contains('@') || string.IsNullOrWhiteSpace(i.FullName))
                return Results.BadRequest(new { error = "Email hoặc họ tên không hợp lệ." });
            if (!PasswordOk(i.Password))
                return Results.BadRequest(new { error = "Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số." });
            if (await db.Users.AnyAsync(u => u.Email == email))
                return Results.Conflict(new { error = "Email này đã được đăng ký." });

            var first = !await db.Users.AnyAsync();
            var user = new User
            {
                Email = email,
                FullName = i.FullName.Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(i.Password),
                Role = first ? Role.Admin : Role.Editor,
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
            var (token, exp) = tokens.Create(user);
            return Results.Ok(new AuthResult(token, exp, user.ToDto()));
        });

        g.MapPost("/login", async (LoginInput i, AppDbContext db, TokenService tokens) =>
        {
            var email = i.Email?.Trim().ToLowerInvariant() ?? "";
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user is null || !BCrypt.Net.BCrypt.Verify(i.Password ?? "", user.PasswordHash))
                return Results.Json(new { error = "Email hoặc mật khẩu không đúng." }, statusCode: 401);
            var (token, exp) = tokens.Create(user);
            return Results.Ok(new AuthResult(token, exp, user.ToDto()));
        });

        g.MapGet("/me", async (HttpContext ctx, AppDbContext db) =>
        {
            var user = await db.Users.FindAsync(ctx.User.UserId());
            return user is null ? Results.Unauthorized() : Results.Ok(user.ToDto());
        }).RequireAuthorization();

        g.MapPut("/me", async (ProfileInput i, HttpContext ctx, AppDbContext db) =>
        {
            var user = await db.Users.FindAsync(ctx.User.UserId());
            if (user is null) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(i.FullName)) return Results.BadRequest(new { error = "Họ tên không được trống." });
            user.FullName = i.FullName.Trim();
            await db.SaveChangesAsync();
            return Results.Ok(user.ToDto());
        }).RequireAuthorization();
    }

    public static bool PasswordOk(string? p) =>
        p is { Length: >= 8 } && p.Any(char.IsUpper) && p.Any(char.IsLower) && p.Any(char.IsDigit);
}
