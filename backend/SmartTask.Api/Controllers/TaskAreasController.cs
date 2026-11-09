using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTask.Application.Tasks;

namespace SmartTask.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/task-areas")]
public sealed class TaskAreasController(ITaskAreaService areaService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<TaskAreaResponse>>> GetAll(CancellationToken cancellationToken) =>
        Ok(await areaService.GetAllAsync(cancellationToken));

    [HttpPost]
    public async Task<ActionResult<TaskAreaResponse>> Create(
        CreateTaskAreaRequest request,
        CancellationToken cancellationToken
    )
    {
        try
        {
            return Ok(await areaService.CreateAsync(request, cancellationToken));
        }
        catch (TaskAreaValidationException ex)
        {
            return ValidationProblem(ToModelState(ex));
        }
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<TaskAreaResponse>> Rename(
        Guid id,
        RenameTaskAreaRequest request,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var renamed = await areaService.RenameAsync(id, request, cancellationToken);
            return renamed is null ? NotFound() : Ok(renamed);
        }
        catch (TaskAreaValidationException ex)
        {
            return ValidationProblem(ToModelState(ex));
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(
        Guid id,
        [FromQuery] Guid? replacementAreaId,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var deleted = await areaService.DeleteAsync(
                id,
                new DeleteTaskAreaRequest { ReplacementAreaId = replacementAreaId },
                cancellationToken
            );
            return deleted ? NoContent() : NotFound();
        }
        catch (TaskAreaValidationException ex)
        {
            return ValidationProblem(ToModelState(ex));
        }
        catch (TaskAreaInUseException ex)
        {
            return Conflict(new { action = "reassign", message = ex.Message, taskCount = ex.TaskCount });
        }
    }

    private static Microsoft.AspNetCore.Mvc.ModelBinding.ModelStateDictionary ToModelState(
        TaskAreaValidationException ex
    )
    {
        var modelState = new Microsoft.AspNetCore.Mvc.ModelBinding.ModelStateDictionary();
        modelState.AddModelError(ex.Field, ex.Message);
        return modelState;
    }
}
