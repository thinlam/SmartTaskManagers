using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTask.Application.Goals;

namespace SmartTask.Api.Controllers;

/// <summary>Same shape as Phase 23/24's controllers — [Authorize] means "has a valid token"; AppDbContext's global query filter is what scopes results to the caller's own UserId (see TasksController's doc comment for why).</summary>
[ApiController]
[Authorize]
[Route("api/goals")]
public sealed class GoalsController(IGoalService goalService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<GoalResponse>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await goalService.GetAllAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<GoalResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var goal = await goalService.GetByIdAsync(id, cancellationToken);
        return goal is null ? NotFound() : Ok(goal);
    }

    [HttpPost]
    public async Task<ActionResult<GoalResponse>> Create(
        CreateGoalRequest request,
        CancellationToken cancellationToken
    )
    {
        var created = await goalService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<GoalResponse>> Update(
        Guid id,
        UpdateGoalRequest request,
        CancellationToken cancellationToken
    )
    {
        var updated = await goalService.UpdateAsync(id, request, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await goalService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
