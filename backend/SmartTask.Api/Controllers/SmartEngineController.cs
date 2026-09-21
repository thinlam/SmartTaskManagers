using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTask.Application.SmartEngine;

namespace SmartTask.Api.Controllers;

/// <summary>
/// Phase 29 — manual on-demand equivalent of the "Recalculate Smart
/// Score" menu action in apps/google-sheets/src/05_SmartEngine.gs
/// (recalculateAllSmartFields_). The daily automatic refresh is
/// DailySmartRecalcHostedService, not this endpoint — this exists so
/// the effect can be triggered on demand (and verified) without waiting
/// for 06:00 UTC.
/// </summary>
[ApiController]
[Authorize]
[Route("api/smart-engine")]
public sealed class SmartEngineController(ISmartEngineService smartEngineService) : ControllerBase
{
    [HttpPost("recalculate-all")]
    public async Task<ActionResult<object>> RecalculateAll(CancellationToken cancellationToken)
    {
        var count = await smartEngineService.RecalculateAllAsync(cancellationToken);
        return Ok(new { updatedCount = count });
    }
}
