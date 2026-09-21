using Microsoft.EntityFrameworkCore;
using SmartTask.Application.Notifications;
using SmartTask.Domain.Notifications;

namespace SmartTask.Persistence.Repositories;

public sealed class NotificationRepository(AppDbContext dbContext) : INotificationRepository
{
    public Task<List<Notification>> GetAllAsync(int limit, CancellationToken cancellationToken = default) =>
        dbContext
            .Notifications.AsNoTracking()
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);

    public Task<int> GetUnreadCountAsync(CancellationToken cancellationToken = default) =>
        dbContext.Notifications.CountAsync(n => !n.IsRead, cancellationToken);

    public Task<Notification?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        dbContext.Notifications.FirstOrDefaultAsync(n => n.Id == id, cancellationToken);

    public Task<bool> HasUnreadAsync(
        NotificationType type,
        Guid? entityId,
        string? title,
        CancellationToken cancellationToken = default
    ) =>
        dbContext.Notifications.AnyAsync(
            n => !n.IsRead && n.Type == type && (entityId != null ? n.EntityId == entityId : n.Title == title),
            cancellationToken
        );

    public async Task AddAsync(Notification notification, CancellationToken cancellationToken = default) =>
        await dbContext.Notifications.AddAsync(notification, cancellationToken);

    public async Task MarkAllReadAsync(CancellationToken cancellationToken = default)
    {
        await dbContext
            .Notifications.Where(n => !n.IsRead)
            .ExecuteUpdateAsync(setters => setters.SetProperty(n => n.IsRead, true), cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
