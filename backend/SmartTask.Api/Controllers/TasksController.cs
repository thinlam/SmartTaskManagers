using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartTask.Application.Tasks;

namespace SmartTask.Api.Controllers;

/// <summary>
/// First real CRUD API on top of Phase 21's schema, gated by Phase 22's
/// JWT auth. [Authorize] here only proves "you have a valid token" — the
/// Tasks table isn't partitioned per-user (no OwnerId column; TASK_HEADERS
/// itself has no Owner field either, matching Personal Mode's "no Team/
/// Member/Owner" rule everywhere else in this app). Every authenticated
/// caller sees the same task list — correct for a single-user personal
/// instance, not a multi-tenant assumption.
/// </summary>
[ApiController]
[Authorize]
[Route("api/tasks")]
public sealed class TasksController(ITaskService taskService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<TaskResponse>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await taskService.GetAllAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TaskResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var task = await taskService.GetByIdAsync(id, cancellationToken);
        return task is null ? NotFound() : Ok(task);
    }

    [HttpPost]
    public async Task<ActionResult<TaskResponse>> Create(
        CreateTaskRequest request,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var created = await taskService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (DbUpdateException)
        {
            // Most likely an invalid ProjectId/GoalId/DependencyTaskId — the FK constraint
            // catches this at the database, not application-level lookups, matching the
            // existing foreign keys set up in Phase 21.
            return BadRequest(
                new { message = "Invalid ProjectId, GoalId, or DependencyTaskId reference." }
            );
        }
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<TaskResponse>> Update(
        Guid id,
        UpdateTaskRequest request,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var updated = await taskService.UpdateAsync(id, request, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (DbUpdateException)
        {
            return BadRequest(
                new { message = "Invalid ProjectId, GoalId, or DependencyTaskId reference." }
            );
        }
    }

    [HttpPost("{id:guid}/complete")]
    public async Task<ActionResult<TaskResponse>> Complete(Guid id, CancellationToken cancellationToken)
    {
        var completed = await taskService.CompleteAsync(id, cancellationToken);
        return completed is null ? NotFound() : Ok(completed);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await taskService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
