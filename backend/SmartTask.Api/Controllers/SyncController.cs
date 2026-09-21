using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTask.Application.Sync;

namespace SmartTask.Api.Controllers;

/// <summary>
/// Phase 28 — see SyncContracts.cs's doc comment for the push/pull design
/// and the last-write-wins conflict rule. [Authorize] only, same as every
/// other controller — no per-caller partitioning, one shared dataset.
/// </summary>
[ApiController]
[Authorize]
[Route("api/sync")]
public sealed class SyncController(ISyncService syncService) : ControllerBase
{
    [HttpPost("push")]
    public async Task<ActionResult<SyncPushResponse>> Push(
        SyncPushRequest request,
        CancellationToken cancellationToken
    )
    {
        return Ok(await syncService.PushAsync(request, cancellationToken));
    }

    [HttpGet("pull")]
    public async Task<ActionResult<SyncPullResponse>> Pull(
        [FromQuery] DateTimeOffset since,
        CancellationToken cancellationToken
    )
    {
        return Ok(await syncService.PullAsync(since, cancellationToken));
    }
}
