using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;
using SmartTask.Application.Tags;

namespace SmartTask.Api.Controllers;

/// <summary>Autocomplete source + tag management screen (đổi tên/gộp/xóa) — Việc 1 of docs/project/plans/2026-11-08-ra-soat-danh-sach-form-cong-viec.md.</summary>
[ApiController]
[Authorize]
[Route("api/tags")]
public sealed class TagsController(ITagService tagService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<TagResponse>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await tagService.GetAllAsync(cancellationToken));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TagResponse>> Rename(
        Guid id,
        RenameTagRequest request,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var renamed = await tagService.RenameAsync(id, request, cancellationToken);
            return renamed is null ? NotFound() : Ok(renamed);
        }
        catch (TagValidationException ex)
        {
            return ValidationProblem(ToModelState(ex));
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Bạn đã có một thẻ khác trùng tên này." });
        }
    }

    [HttpPost("merge")]
    public async Task<ActionResult<TagResponse>> Merge(
        MergeTagsRequest request,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var merged = await tagService.MergeAsync(request, cancellationToken);
            return merged is null ? NotFound() : Ok(merged);
        }
        catch (TagValidationException ex)
        {
            return ValidationProblem(ToModelState(ex));
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await tagService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    private static ModelStateDictionary ToModelState(TagValidationException ex)
    {
        var modelState = new ModelStateDictionary();
        foreach (var (field, messages) in ex.Errors)
        {
            foreach (var message in messages)
            {
                modelState.AddModelError(field, message);
            }
        }
        return modelState;
    }
}
