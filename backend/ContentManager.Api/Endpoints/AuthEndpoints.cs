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

            // Every sign-up starts with its own empty workspace and becomes its admin.
            var workspace = new Workspace { Name = $"Không gian của {i.FullName.Trim()}" };
            var user = new User
            {
                WorkspaceId = workspace.Id,
                Email = email,
                FullName = i.FullName.Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(i.Password),
                Role = Role.Admin,
            };
            db.Workspaces.Add(workspace);
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
        g.MapPut("/password", async (PasswordInput i, HttpContext ctx, AppDbContext db) =>
        {
            var user = await db.Users.FindAsync(ctx.User.UserId());
            if (user is null) return Results.Unauthorized();
            if (!BCrypt.Net.BCrypt.Verify(i.CurrentPassword ?? "", user.PasswordHash))
                return Results.BadRequest(new { error = "Mật khẩu hiện tại không đúng." });
            if (!PasswordOk(i.NewPassword))
                return Results.BadRequest(new { error = "Mật khẩu mới tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số." });
            if (i.NewPassword == i.CurrentPassword)
                return Results.BadRequest(new { error = "Mật khẩu mới phải khác mật khẩu hiện tại." });
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(i.NewPassword);
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).RequireAuthorization();

        var ws = app.MapGroup("/api/workspace").RequireAuthorization();

        ws.MapGet("", async (AppDbContext db, ITenant tenant) =>
        {
            var w = await db.Workspaces.AsNoTracking().FirstOrDefaultAsync(x => x.Id == tenant.WorkspaceId);
            if (w is null) return Results.NotFound();
            return Results.Ok(new WorkspaceDto(w.Id, w.Name, w.CreatedAt,
                await db.Users.CountAsync(u => u.WorkspaceId == w.Id),
                await db.Contents.CountAsync(),
                await db.Media.SumAsync(m => (long?)m.Size) ?? 0));
        });

        ws.MapPut("", async (WorkspaceInput i, HttpContext ctx, AppDbContext db, ITenant tenant) =>
        {
            var me = await db.Users.FindAsync(ctx.User.UserId());
            if (me is null || me.Role != Role.Admin) return Results.Forbid();
            var name = i.Name?.Trim() ?? "";
            if (name.Length is < 1 or > 100) return Results.BadRequest(new { error = "Tên workspace phải từ 1 đến 100 ký tự." });
            var w = await db.Workspaces.FindAsync(tenant.WorkspaceId);
            if (w is null) return Results.NotFound();
            w.Name = name;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    public static bool PasswordOk(string? p) =>
        p is { Length: >= 8 } && p.Any(char.IsUpper) && p.Any(char.IsLower) && p.Any(char.IsDigit);
}
