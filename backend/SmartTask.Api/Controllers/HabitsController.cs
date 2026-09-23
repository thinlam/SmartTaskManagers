using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTask.Application.Habits;

namespace SmartTask.Api.Controllers;

/// <summary>
/// Same shape as Phase 23-25's controllers — [Authorize] means "has a
/// valid token"; AppDbContext's global query filter is what scopes
/// results to the caller's own UserId. Habits stand alone: there's
/// no Habits.ProjectId/GoalId-style FK on Tasks to cascade-clear on
/// delete (grepping apps/google-sheets/src confirmed no HabitId column
/// on TASK_HEADERS either), so unlike Phase 24/25 there's no cross-
/// entity behavior to verify here.
/// </summary>
[ApiController]
[Authorize]
[Route("api/habits")]
public sealed class HabitsController(IHabitService habitService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<HabitResponse>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await habitService.GetAllAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<HabitResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var habit = await habitService.GetByIdAsync(id, cancellationToken);
        return habit is null ? NotFound() : Ok(habit);
    }

    [HttpPost]
    public async Task<ActionResult<HabitResponse>> Create(
        CreateHabitRequest request,
        CancellationToken cancellationToken
    )
    {
        var created = await habitService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<HabitResponse>> Update(
        Guid id,
        UpdateHabitRequest request,
        CancellationToken cancellationToken
    )
    {
        var updated = await habitService.UpdateAsync(id, request, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpPost("{id:guid}/check-in")]
    public async Task<ActionResult<HabitResponse>> CheckIn(Guid id, CancellationToken cancellationToken)
    {
        var checkedIn = await habitService.CheckInAsync(id, cancellationToken);
        return checkedIn is null ? NotFound() : Ok(checkedIn);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await habitService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
