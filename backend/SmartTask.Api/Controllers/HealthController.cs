using Microsoft.AspNetCore.Mvc;
using SmartTask.Application.Abstractions;
using SmartTask.Application.Health;

namespace SmartTask.Api.Controllers;

/// <summary>
/// The one real endpoint in this Phase's skeleton — GET /api/health
/// depends on IDateTimeProvider (Application), resolved from Infrastructure's
/// SystemDateTimeProvider via DI, proving the composition root wires all
/// 4 layers correctly before any real Task/Project/Goal/Habit endpoint
/// exists (that's Phase 23-26).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class HealthController(IDateTimeProvider dateTimeProvider) : ControllerBase
{
    [HttpGet]
    public ActionResult<ApiHealthReport> Get()
    {
        return Ok(new ApiHealthReport("Healthy", dateTimeProvider.UtcNow));
    }
}
