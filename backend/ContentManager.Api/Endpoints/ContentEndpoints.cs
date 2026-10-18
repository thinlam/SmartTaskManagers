using ContentManager.Api.Data;
using ContentManager.Api.Domain;
using ContentManager.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace ContentManager.Api.Endpoints;

public static class ContentEndpoints
{
    public static void MapContents(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/contents").RequireAuthorization();

        g.MapGet("", async (AppDbContext db, string? q, ContentStatus? status, Channel? channel, Guid? campaignId,
            Guid? assigneeId, Priority? priority, DateTime? from, DateTime? to, string? sort, int? page, int? pageSize) =>
        {
            var query = db.Contents.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(q))
            {
                var like = $"%{q.Trim()}%";
                var digits = new string(q.Where(char.IsDigit).ToArray());
                var number = q.TrimStart().StartsWith("cnt", StringComparison.OrdinalIgnoreCase)
                    && int.TryParse(digits, out var n) ? n : -1;
                query = query.Where(c => EF.Functions.ILike(c.Title, like) || c.Number == number);
            }
            if (status is not null) query = query.Where(c => c.Status == status);
            if (channel is not null) query = query.Where(c => c.Channel == channel);
            if (campaignId is not null) query = query.Where(c => c.CampaignId == campaignId);
            if (assigneeId is not null) query = query.Where(c => c.AssigneeId == assigneeId);
            if (priority is not null) query = query.Where(c => c.Priority == priority);
            if (from is not null) { var f = Mapping.Utc(from); query = query.Where(c => c.ScheduledAt >= f); }
            if (to is not null) { var t = Mapping.Utc(to); query = query.Where(c => c.ScheduledAt < t); }

            query = sort switch
            {
                "scheduled" => query.OrderBy(c => c.ScheduledAt == null).ThenBy(c => c.ScheduledAt),
                "title" => query.OrderBy(c => c.Title),
                "updated" => query.OrderByDescending(c => c.UpdatedAt),
                _ => query.OrderByDescending(c => c.Number),
            };

            var size = Math.Clamp(pageSize ?? 20, 1, 500);
            var p = Math.Max(page ?? 1, 1);
            var total = await query.CountAsync();
            var items = await query.Include(c => c.Assignee).Include(c => c.Campaign).Include(c => c.Media)
                .Skip((p - 1) * size).Take(size).ToListAsync();
            return Results.Ok(new PagedResult<ContentDto>(items.Select(c => c.ToDto()).ToList(), total, p, size));
        });

        g.MapGet("/{id:guid}", async (Guid id, AppDbContext db) =>
        {
            var c = await Load(db).FirstOrDefaultAsync(x => x.Id == id);
            return c is null ? Results.NotFound() : Results.Ok(c.ToDto());
        });

        g.MapPost("", async (ContentInput i, HttpContext ctx, AppDbContext db) =>
        {
            var err = Validate(i, creating: true);
            if (err is not null) return Results.BadRequest(new { error = err });

            var status = i.Status ?? ContentStatus.Idea;
            var c = new Content
            {
                Number = (await db.Contents.MaxAsync(x => (int?)x.Number) ?? 0) + 1,
                Title = i.Title!.Trim(),
                Description = i.Description,
                Channel = i.Channel!.Value,
                Status = status,
                Priority = i.Priority ?? Priority.Medium,
                Progress = Math.Clamp(i.Progress ?? Mapping.DefaultProgress(status), 0, 100),
                AssigneeId = i.AssigneeId ?? ctx.User.UserId(),
                CampaignId = i.CampaignId,
                ScheduledAt = Mapping.Utc(i.ScheduledAt),
                PublishedAt = status == ContentStatus.Published ? DateTime.UtcNow : null,
            };
            db.Contents.Add(c);
            await db.SaveChangesAsync();
            await AttachMedia(db, c.Id, i.MediaIds);
            Log(db, ctx, "created", c);
            await db.SaveChangesAsync();
            return Results.Created($"/api/contents/{c.Id}", (await Load(db).FirstAsync(x => x.Id == c.Id)).ToDto());
        });

        g.MapPut("/{id:guid}", async (Guid id, ContentInput i, HttpContext ctx, AppDbContext db) =>
        {
            var c = await db.Contents.FindAsync(id);
            if (c is null) return Results.NotFound();
            var err = Validate(i, creating: false);
            if (err is not null) return Results.BadRequest(new { error = err });

            if (i.Title is not null) c.Title = i.Title.Trim();
            if (i.Description is not null) c.Description = i.Description;
            if (i.Channel is not null) c.Channel = i.Channel.Value;
            if (i.Priority is not null) c.Priority = i.Priority.Value;
            if (i.Progress is not null) c.Progress = Math.Clamp(i.Progress.Value, 0, 100);
            c.AssigneeId = i.AssigneeId ?? c.AssigneeId;
            c.CampaignId = i.CampaignId;
            if (i.ScheduledAt is not null) c.ScheduledAt = Mapping.Utc(i.ScheduledAt);
            var statusChanged = i.Status is not null && i.Status != c.Status;
            if (statusChanged) ApplyStatus(c, i.Status!.Value, i.Progress is null);
            c.UpdatedAt = DateTime.UtcNow;
            await AttachMedia(db, c.Id, i.MediaIds);
            Log(db, ctx, statusChanged ? "status" : "updated", c);
            await db.SaveChangesAsync();
            return Results.Ok((await Load(db).FirstAsync(x => x.Id == id)).ToDto());
        });

        g.MapPatch("/{id:guid}/status", async (Guid id, StatusInput i, HttpContext ctx, AppDbContext db) =>
        {
            var c = await db.Contents.FindAsync(id);
            if (c is null) return Results.NotFound();
            if (c.Status != i.Status)
            {
                ApplyStatus(c, i.Status, true);
                c.UpdatedAt = DateTime.UtcNow;
                Log(db, ctx, i.Status == ContentStatus.Published ? "published" : "status", c);
                await db.SaveChangesAsync();
            }
            return Results.Ok((await Load(db).FirstAsync(x => x.Id == id)).ToDto());
        });

        g.MapDelete("/{id:guid}", async (Guid id, HttpContext ctx, AppDbContext db) =>
        {
            var c = await db.Contents.FindAsync(id);
            if (c is null) return Results.NotFound();
            Log(db, ctx, "deleted", c, withContentId: false);
            db.Contents.Remove(c);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        g.MapPost("/bulk-delete", async (BulkDeleteInput i, AppDbContext db) =>
        {
            var n = await db.Contents.Where(c => i.Ids.Contains(c.Id)).ExecuteDeleteAsync();
            return Results.Ok(new { deleted = n });
        });
    }

    private static IQueryable<Content> Load(AppDbContext db) =>
        db.Contents.Include(c => c.Assignee).Include(c => c.Campaign).Include(c => c.Media);

    private static string? Validate(ContentInput i, bool creating)
    {
        if (creating && string.IsNullOrWhiteSpace(i.Title)) return "Tiêu đề là bắt buộc.";
        if (!creating && i.Title is not null && string.IsNullOrWhiteSpace(i.Title)) return "Tiêu đề không được trống.";
        if (i.Title is { Length: > 300 }) return "Tiêu đề tối đa 300 ký tự.";
        if (creating && i.Channel is null) return "Kênh là bắt buộc.";
        return null;
    }

    private static void ApplyStatus(Content c, ContentStatus status, bool resetProgress)
    {
        c.Status = status;
        if (resetProgress) c.Progress = Mapping.DefaultProgress(status);
        c.PublishedAt = status == ContentStatus.Published ? DateTime.UtcNow : null;
    }

    private static async Task AttachMedia(AppDbContext db, Guid contentId, List<Guid>? ids)
    {
        if (ids is null) return;
        await db.Media.Where(m => m.ContentId == contentId && !ids.Contains(m.Id))
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.ContentId, (Guid?)null));
        await db.Media.Where(m => ids.Contains(m.Id))
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.ContentId, (Guid?)contentId));
    }

    private static void Log(AppDbContext db, HttpContext ctx, string action, Content c, bool withContentId = true) =>
        db.Activities.Add(new ActivityLog
        {
            UserId = ctx.User.UserId(),
            Action = action,
            Subject = c.Title,
            ContentId = withContentId ? c.Id : null,
        });
}
