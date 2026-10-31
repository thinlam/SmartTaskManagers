using ContentManager.Api.Data;
using ContentManager.Api.Domain;
using ContentManager.Api.Services;
using Microsoft.EntityFrameworkCore;


namespace ContentManager.Api.Endpoints;

/// <summary>Campaigns, members, media and activity feed.</summary>
public static class MiscEndpoints
{
    public static void MapMisc(this IEndpointRouteBuilder app, IConfiguration config)
    {
        MapCampaigns(app);
        MapMembers(app);
        MapMedia(app, config);

        app.MapGet("/api/activities", async (AppDbContext db, int? take) =>
        {
            var rows = await db.Activities.AsNoTracking().Include(a => a.User)
                .OrderByDescending(a => a.CreatedAt).Take(Math.Clamp(take ?? 20, 1, 100)).ToListAsync();
            return Results.Ok(rows.Select(a => new ActivityDto(a.Id, a.Action, a.Subject, a.ContentId,
                a.User is null ? null : new UserRef(a.User.Id, a.User.FullName), a.CreatedAt)));
        }).RequireAuthorization();
    }

    private static void MapCampaigns(IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/campaigns").RequireAuthorization();

        g.MapGet("", async (AppDbContext db) =>
        {
            var rows = await db.Campaigns.AsNoTracking().OrderByDescending(c => c.CreatedAt)
                .Select(c => new CampaignDto(c.Id, c.Name, c.Description, c.StartDate, c.EndDate, c.Status,
                    db.Contents.Count(x => x.CampaignId == c.Id),
                    db.Contents.Count(x => x.CampaignId == c.Id && x.Status == ContentStatus.Published)))
                .ToListAsync();
            return Results.Ok(rows);
        });

        g.MapPost("", async (CampaignInput i, AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(i.Name)) return Results.BadRequest(new { error = "Tên chiến dịch là bắt buộc." });
            var c = new Campaign
            {
                Name = i.Name.Trim(), Description = i.Description,
                StartDate = Mapping.Utc(i.StartDate), EndDate = Mapping.Utc(i.EndDate),
                Status = i.Status ?? CampaignStatus.Planned,
            };
            db.Campaigns.Add(c);
            await db.SaveChangesAsync();
            return Results.Created($"/api/campaigns/{c.Id}", new CampaignDto(c.Id, c.Name, c.Description, c.StartDate, c.EndDate, c.Status, 0, 0));
        }).RequireRole(RoleAccess.CanEdit);

        g.MapPut("/{id:guid}", async (Guid id, CampaignInput i, AppDbContext db) =>
        {
            var c = await db.Campaigns.FindAsync(id);
            if (c is null) return Results.NotFound();
            if (i.Name is not null)
            {
                if (string.IsNullOrWhiteSpace(i.Name)) return Results.BadRequest(new { error = "Tên chiến dịch không được trống." });
                c.Name = i.Name.Trim();
            }
            c.Description = i.Description ?? c.Description;
            c.StartDate = Mapping.Utc(i.StartDate) ?? c.StartDate;
            c.EndDate = Mapping.Utc(i.EndDate) ?? c.EndDate;
            c.Status = i.Status ?? c.Status;
            await db.SaveChangesAsync();
            var total = await db.Contents.CountAsync(x => x.CampaignId == id);
            var pub = await db.Contents.CountAsync(x => x.CampaignId == id && x.Status == ContentStatus.Published);
            return Results.Ok(new CampaignDto(c.Id, c.Name, c.Description, c.StartDate, c.EndDate, c.Status, total, pub));
        }).RequireRole(RoleAccess.CanEdit);

        g.MapDelete("/{id:guid}", async (Guid id, AppDbContext db) =>
        {
            var c = await db.Campaigns.FindAsync(id);
            if (c is null) return Results.NotFound();
            db.Campaigns.Remove(c);
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).RequireRole(RoleAccess.AdminOnly);
    }

    private static void MapMembers(IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/members").RequireAuthorization();

        g.MapGet("", async (AppDbContext db, ITenant tenant) =>
            Results.Ok((await db.Users.AsNoTracking().Where(u => u.WorkspaceId == tenant.WorkspaceId)
                .OrderBy(u => u.CreatedAt).ToListAsync()).Select(u => u.ToDto())));

        g.MapPost("", async (MemberInput i, HttpContext ctx, AppDbContext db, ITenant tenant) =>
        {
            if (!await IsAdmin(ctx, db)) return Results.Forbid();
            var email = i.Email?.Trim().ToLowerInvariant() ?? "";
            if (!email.Contains('@') || string.IsNullOrWhiteSpace(i.FullName))
                return Results.BadRequest(new { error = "Email hoặc họ tên không hợp lệ." });
            if (!AuthEndpoints.PasswordOk(i.Password))
                return Results.BadRequest(new { error = "Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số." });
            if (await db.Users.AnyAsync(u => u.Email == email))
                return Results.Conflict(new { error = "Email này đã được đăng ký." });
            var u = new User
            {
                WorkspaceId = tenant.WorkspaceId,
                Email = email, FullName = i.FullName.Trim(), Role = i.Role,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(i.Password),
            };
            db.Users.Add(u);
            await db.SaveChangesAsync();
            return Results.Created($"/api/members/{u.Id}", u.ToDto());
        });

        g.MapPut("/{id:guid}/role", async (Guid id, RoleInput i, HttpContext ctx, AppDbContext db, ITenant tenant) =>
        {
            if (!await IsAdmin(ctx, db)) return Results.Forbid();
            var u = await db.Users.FirstOrDefaultAsync(x => x.Id == id && x.WorkspaceId == tenant.WorkspaceId);
            if (u is null) return Results.NotFound();
            if (u.Id == ctx.User.UserId() && i.Role != Role.Admin)
                return Results.BadRequest(new { error = "Không thể tự hạ quyền quản trị của chính mình." });
            u.Role = i.Role;
            await db.SaveChangesAsync();
            return Results.Ok(u.ToDto());
        });

        g.MapDelete("/{id:guid}", async (Guid id, HttpContext ctx, AppDbContext db, ITenant tenant) =>
        {
            if (!await IsAdmin(ctx, db)) return Results.Forbid();
            if (id == ctx.User.UserId()) return Results.BadRequest(new { error = "Không thể xóa chính mình." });
            var u = await db.Users.FirstOrDefaultAsync(x => x.Id == id && x.WorkspaceId == tenant.WorkspaceId);
            if (u is null) return Results.NotFound();
            db.Users.Remove(u);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    private static async Task<bool> IsAdmin(HttpContext ctx, AppDbContext db)
    {
        var id = ctx.User.UserId();
        return await db.Users.AnyAsync(u => u.Id == id && u.Role == Role.Admin);
    }

    private static void MapMedia(IEndpointRouteBuilder app, IConfiguration config)
    {
        var dir = config["Storage:Path"] ?? Path.Combine(AppContext.BaseDirectory, "uploads");
        Directory.CreateDirectory(dir);
        var maxBytes = (config.GetValue<long?>("Storage:MaxFileMb") ?? 100) * 1024 * 1024;
        string[] allowed = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp4", ".mov"];
        var g = app.MapGroup("/api/media");

        g.MapGet("", async (AppDbContext db, string? q, string? type) =>
        {
            var query = db.Media.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(q)) query = query.Where(m => EF.Functions.ILike(m.FileName, $"%{q.Trim()}%"));
            if (type == "image") query = query.Where(m => m.ContentType.StartsWith("image/"));
            if (type == "video") query = query.Where(m => m.ContentType.StartsWith("video/"));
            var rows = await query.OrderByDescending(m => m.CreatedAt)
                .Select(m => new { m, By = db.Users.Where(u => u.Id == m.UploadedById && u.WorkspaceId == m.WorkspaceId).Select(u => u.FullName).FirstOrDefault() })
                .ToListAsync();
            return Results.Ok(rows.Select(r => r.m.ToDto(r.By)));
        }).RequireAuthorization();

        g.MapGet("/usage", async (AppDbContext db) =>
        {
            var used = await db.Media.SumAsync(m => (long?)m.Size) ?? 0;
            var limit = (config.GetValue<long?>("Storage:LimitGb") ?? 100) * 1024L * 1024 * 1024;
            return Results.Ok(new { usedBytes = used, limitBytes = limit });
        }).RequireAuthorization();

        g.MapPost("", async (HttpRequest req, HttpContext ctx, AppDbContext db) =>
        {
            if (!req.HasFormContentType) return Results.BadRequest(new { error = "Yêu cầu phải là multipart/form-data." });
            var form = await req.ReadFormAsync();
            var created = new List<MediaDto>();
            foreach (var file in form.Files)
            {
                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!allowed.Contains(ext))
                    return Results.BadRequest(new { error = $"Định dạng {ext} không được hỗ trợ (PNG, JPG, GIF, WEBP, MP4, MOV)." });
                if (file.Length > maxBytes)
                    return Results.BadRequest(new { error = $"{file.FileName} vượt quá giới hạn {maxBytes / 1024 / 1024}MB." });

                var asset = new MediaAsset
                {
                    FileName = Path.GetFileName(file.FileName),
                    ContentType = file.ContentType,
                    Size = file.Length,
                    UploadedById = ctx.User.UserId(),
                };
                asset.StoredName = asset.Id.ToString("N") + ext;
                await using (var fs = File.Create(Path.Combine(dir, asset.StoredName)))
                    await file.CopyToAsync(fs);
                db.Media.Add(asset);
                db.Activities.Add(new ActivityLog { UserId = asset.UploadedById, Action = "uploaded", Subject = asset.FileName });
                created.Add(asset.ToDto(null));
            }
            await db.SaveChangesAsync();
            return Results.Ok(created);
        }).RequireAuthorization().DisableAntiforgery().RequireRole(RoleAccess.CanEdit);

        // Anonymous on purpose: <img>/<video> tags cannot send an Authorization
        // header, and the file id is an unguessable GUID.
        g.MapGet("/{id:guid}/file", async (Guid id, AppDbContext db) =>
        {
            var m = await db.Media.IgnoreQueryFilters().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            var path = m is null ? null : Path.Combine(dir, m.StoredName);
            return path is null || !File.Exists(path)
                ? Results.NotFound()
                : Results.File(path, m!.ContentType, enableRangeProcessing: true);
        });

        g.MapDelete("/{id:guid}", async (Guid id, AppDbContext db) =>
        {
            var m = await db.Media.FindAsync(id);
            if (m is null) return Results.NotFound();
            var path = Path.Combine(dir, m.StoredName);
            if (File.Exists(path)) File.Delete(path);
            db.Media.Remove(m);
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).RequireAuthorization().RequireRole(RoleAccess.AdminOnly);
    }
}
