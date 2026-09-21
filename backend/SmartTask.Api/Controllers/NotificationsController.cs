using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTask.Application.Notifications;

namespace SmartTask.Api.Controllers;

/// <summary>
/// Phase 30 — see Notification.cs's doc comment for the 4 trigger rules
/// and why this is a persisted table, not a live-computed list.
/// [Authorize] only, same as every other controller — one shared
/// notification feed, not partitioned per caller.
/// </summary>
[ApiController]
[Authorize]
[Route("api/notifications")]
public sealed class NotificationsController(INotificationService notificationService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<NotificationResponse>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await notificationService.GetAllAsync(cancellationToken));
    }

    [HttpGet("unread-count")]
    public async Task<ActionResult<object>> GetUnreadCount(CancellationToken cancellationToken)
    {
        var count = await notificationService.GetUnreadCountAsync(cancellationToken);
        return Ok(new { unreadCount = count });
    }

    [HttpPost("{id:guid}/read")]
    public async Task<ActionResult<NotificationResponse>> MarkRead(Guid id, CancellationToken cancellationToken)
    {
        var updated = await notificationService.MarkReadAsync(id, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken)
    {
        await notificationService.MarkAllReadAsync(cancellationToken);
        return NoContent();
    }

    /// <summary>Manual equivalent of NotificationGenerationHostedService's periodic run — for on-demand testing without waiting for the timer.</summary>
    [HttpPost("generate")]
    public async Task<ActionResult<object>> Generate(CancellationToken cancellationToken)
    {
        var count = await notificationService.GenerateAsync(cancellationToken);
        return Ok(new { createdCount = count });
    }
}
