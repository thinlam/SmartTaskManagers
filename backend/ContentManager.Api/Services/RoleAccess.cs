using ContentManager.Api.Data;
using ContentManager.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace ContentManager.Api.Services;

public static class RoleAccess
{
    /// <summary>
    /// Allows the endpoint only for the listed roles. The role is read from the database on every
    /// call rather than from the JWT, so a role change takes effect immediately.
    /// </summary>
    public static TBuilder RequireRole<TBuilder>(this TBuilder builder, params Role[] roles)
        where TBuilder : IEndpointConventionBuilder =>
        builder.AddEndpointFilter(async (ctx, next) =>
        {
            var http = ctx.HttpContext;
            var db = http.RequestServices.GetRequiredService<AppDbContext>();
            var id = http.User.UserId();
            var role = await db.Users.AsNoTracking()
                .Where(u => u.Id == id).Select(u => (Role?)u.Role).FirstOrDefaultAsync();
            if (role is null || !roles.Contains(role.Value))
                return Results.Json(new { error = "Vai trò của bạn không có quyền thực hiện thao tác này." },
                    statusCode: StatusCodes.Status403Forbidden);
            return await next(ctx);
        });

    public static readonly Role[] CanEdit = [Role.Admin, Role.Editor];
    public static readonly Role[] AdminOnly = [Role.Admin];
}
