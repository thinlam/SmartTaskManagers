using ContentManager.Api.Data;
using ContentManager.Api.Domain;
using ContentManager.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace ContentManager.Api.Endpoints;

public static class DashboardEndpoints
{
    public record Kpi(int Value, double? DeltaPercent);
    public record WeekPoint(string Label, int Created, int Published);

    public static void MapDashboard(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/dashboard", async (AppDbContext db, string? range, Channel? channel, Guid? assigneeId, int? tzOffset) =>
        {
            var offset = TimeSpan.FromMinutes(Math.Clamp(tzOffset ?? 0, -840, 840));
            var now = DateTime.UtcNow;
            var localNow = now + offset;
            var month = range == "month";

            // Period boundaries are computed in the caller's local time, then converted back to UTC.
            var localStart = month
                ? new DateTime(localNow.Year, localNow.Month, 1)
                : localNow.Date.AddDays(-(((int)localNow.DayOfWeek + 6) % 7));
            var localPrevStart = month ? localStart.AddMonths(-1) : localStart.AddDays(-7);
            var start = DateTime.SpecifyKind(localStart - offset, DateTimeKind.Utc);
            var prevStart = DateTime.SpecifyKind(localPrevStart - offset, DateTimeKind.Utc);
            var end = DateTime.SpecifyKind((month ? localStart.AddMonths(1) : localStart.AddDays(7)) - offset, DateTimeKind.Utc);
            var todayStart = DateTime.SpecifyKind(localNow.Date - offset, DateTimeKind.Utc);
            var todayEnd = todayStart.AddDays(1);

            var q = db.Contents.AsNoTracking().AsQueryable();
            if (channel is not null) q = q.Where(c => c.Channel == channel);
            if (assigneeId is not null) q = q.Where(c => c.AssigneeId == assigneeId);

            static double? Delta(int cur, int prev) => prev == 0 ? (cur == 0 ? 0 : null) : Math.Round((cur - prev) * 100.0 / prev, 1);

            var total = await q.CountAsync();
            var createdNow = await q.CountAsync(c => c.CreatedAt >= start && c.CreatedAt < end);
            var createdPrev = await q.CountAsync(c => c.CreatedAt >= prevStart && c.CreatedAt < start);

            var publishedNow = await q.CountAsync(c => c.PublishedAt >= start && c.PublishedAt < end);
            var publishedPrev = await q.CountAsync(c => c.PublishedAt >= prevStart && c.PublishedAt < start);

            Task<int> Moved(ContentStatus s, DateTime a, DateTime b) =>
                q.CountAsync(c => c.Status == s && c.UpdatedAt >= a && c.UpdatedAt < b);

            var drafting = await q.CountAsync(c => c.Status == ContentStatus.Drafting);
            var review = await q.CountAsync(c => c.Status == ContentStatus.Review);
            var overdue = await q.CountAsync(c => c.ScheduledAt < now && c.Status != ContentStatus.Published);

            var dueNow = await q.CountAsync(c => c.ScheduledAt >= start && c.ScheduledAt < end);
            var dueDoneNow = await q.CountAsync(c => c.ScheduledAt >= start && c.ScheduledAt < end && c.Status == ContentStatus.Published);
            var duePrev = await q.CountAsync(c => c.ScheduledAt >= prevStart && c.ScheduledAt < start);
            var dueDonePrev = await q.CountAsync(c => c.ScheduledAt >= prevStart && c.ScheduledAt < start && c.Status == ContentStatus.Published);
            var rateNow = dueNow == 0 ? 0 : (int)Math.Round(dueDoneNow * 100.0 / dueNow);
            var ratePrev = duePrev == 0 ? 0 : (int)Math.Round(dueDonePrev * 100.0 / duePrev);

            var focusQuery = q.Where(c => c.Status != ContentStatus.Published && c.ScheduledAt < todayEnd && c.ScheduledAt != null);
            var focusCount = await focusQuery.CountAsync();
            var focus = await focusQuery.Include(c => c.Assignee).Include(c => c.Campaign).Include(c => c.Media)
                .OrderBy(c => c.ScheduledAt).Take(5).ToListAsync();

            var upcoming = await q.Where(c => c.Status != ContentStatus.Published && c.ScheduledAt >= now)
                .Include(c => c.Assignee).Include(c => c.Campaign).Include(c => c.Media)
                .OrderBy(c => c.ScheduledAt).Take(5).ToListAsync();

            var byChannel = await q.GroupBy(c => c.Channel).Select(g => new { Channel = g.Key, Count = g.Count() }).ToListAsync();

            // Last 4 weeks (Mon-Sun, local), oldest first.
            var weeks = new List<WeekPoint>();
            var thisWeekStart = localNow.Date.AddDays(-(((int)localNow.DayOfWeek + 6) % 7));
            for (var w = 3; w >= 0; w--)
            {
                var ls = thisWeekStart.AddDays(-7 * w);
                var ws = DateTime.SpecifyKind(ls - offset, DateTimeKind.Utc);
                var we = ws.AddDays(7);
                var created = await q.CountAsync(c => c.CreatedAt >= ws && c.CreatedAt < we);
                var published = await q.CountAsync(c => c.PublishedAt >= ws && c.PublishedAt < we);
                var iso = System.Globalization.ISOWeek.GetWeekOfYear(ls);
                weeks.Add(new WeekPoint($"Tuần {iso}|{ls:dd/MM} - {ls.AddDays(6):dd/MM}", created, published));
            }

            var acts = await db.Activities.AsNoTracking().Include(a => a.User)
                .OrderByDescending(a => a.CreatedAt).Take(6).ToListAsync();

            return Results.Ok(new
            {
                range = month ? "month" : "week",
                kpis = new
                {
                    total = new Kpi(total, Delta(createdNow, createdPrev)),
                    published = new Kpi(publishedNow, Delta(publishedNow, publishedPrev)),
                    drafting = new Kpi(drafting, Delta(await Moved(ContentStatus.Drafting, start, end), await Moved(ContentStatus.Drafting, prevStart, start))),
                    review = new Kpi(review, Delta(await Moved(ContentStatus.Review, start, end), await Moved(ContentStatus.Review, prevStart, start))),
                    overdue = new Kpi(overdue, null as double?),
                    completionRate = new Kpi(rateNow, Delta(rateNow, ratePrev)),
                },
                focus = new { count = focusCount, items = focus.Select(c => c.ToDto()) },
                upcoming = upcoming.Select(c => c.ToDto()),
                byChannel = byChannel.Select(x => new { channel = x.Channel, count = x.Count }),
                weekly = weeks,
                activities = acts.Select(a => new ActivityDto(a.Id, a.Action, a.Subject, a.ContentId,
                    a.User is null ? null : new UserRef(a.User.Id, a.User.FullName), a.CreatedAt)),
            });
        }).RequireAuthorization();

        app.MapGet("/api/reports/summary", async (AppDbContext db, DateTime? from, DateTime? to) =>
        {
            var q = db.Contents.AsNoTracking().AsQueryable();
            if (from is not null) { var f = Mapping.Utc(from); q = q.Where(c => c.CreatedAt >= f); }
            if (to is not null) { var t = Mapping.Utc(to); q = q.Where(c => c.CreatedAt < t); }

            var total = await q.CountAsync();
            var published = await q.CountAsync(c => c.Status == ContentStatus.Published);
            var byStatus = await q.GroupBy(c => c.Status).Select(g => new { status = g.Key, count = g.Count() }).ToListAsync();
            var byChannel = await q.GroupBy(c => c.Channel).Select(g => new
            {
                channel = g.Key, count = g.Count(), published = g.Count(c => c.Status == ContentStatus.Published),
            }).ToListAsync();
            var byAssignee = await q.Where(c => c.Assignee != null).GroupBy(c => c.Assignee!.FullName).Select(g => new
            {
                name = g.Key, count = g.Count(), published = g.Count(c => c.Status == ContentStatus.Published),
            }).OrderByDescending(x => x.count).ToListAsync();
            var byCampaign = await q.Where(c => c.Campaign != null).GroupBy(c => c.Campaign!.Name).Select(g => new
            {
                name = g.Key, count = g.Count(), published = g.Count(c => c.Status == ContentStatus.Published),
            }).OrderByDescending(x => x.count).ToListAsync();

            return Results.Ok(new
            {
                total, published,
                completionRate = total == 0 ? 0 : (int)Math.Round(published * 100.0 / total),
                byStatus, byChannel, byAssignee, byCampaign,
            });
        }).RequireAuthorization();
    }
}
