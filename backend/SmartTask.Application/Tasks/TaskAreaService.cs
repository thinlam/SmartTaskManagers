using SmartTask.Domain.Tasks;

namespace SmartTask.Application.Tasks;

public sealed class TaskAreaService(ITaskAreaRepository areaRepository) : ITaskAreaService
{
    public async Task<List<TaskAreaResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var areas = await areaRepository.GetAllAsync(cancellationToken);
        return areas.OrderBy(a => a.SortOrder).ThenBy(a => a.NameVi).Select(ToResponse).ToList();
    }

    public async Task<TaskAreaResponse> CreateAsync(
        CreateTaskAreaRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var nameVi = request.NameVi.Trim();
        if (nameVi.Length == 0)
        {
            throw TaskAreaValidationException.ForField("NameVi", "Tên lĩnh vực không được để trống.");
        }

        var nameEn = request.NameEn?.Trim();
        var area = new TaskArea
        {
            Key = Guid.NewGuid().ToString("N"),
            NameVi = nameVi,
            NameEn = nameEn is null or { Length: 0 } ? nameVi : nameEn,
            IsSystem = false,
            SortOrder = 999,
        };

        await areaRepository.AddAsync(area, cancellationToken);
        await areaRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(area);
    }

    public async Task<TaskAreaResponse?> RenameAsync(
        Guid id,
        RenameTaskAreaRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var area = await areaRepository.GetByIdAsync(id, cancellationToken);
        if (area is null)
        {
            return null;
        }
        if (area.IsSystem)
        {
            throw TaskAreaValidationException.ForField("Id", "Không thể đổi tên lĩnh vực hệ thống.");
        }

        var nameVi = request.NameVi.Trim();
        if (nameVi.Length == 0)
        {
            throw TaskAreaValidationException.ForField("NameVi", "Tên lĩnh vực không được để trống.");
        }
        var nameEn = request.NameEn?.Trim();

        area.NameVi = nameVi;
        area.NameEn = nameEn is null or { Length: 0 } ? nameVi : nameEn;
        await areaRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(area);
    }

    public async Task<bool> DeleteAsync(
        Guid id,
        DeleteTaskAreaRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var area = await areaRepository.GetByIdAsync(id, cancellationToken);
        if (area is null)
        {
            return false;
        }
        if (area.IsSystem)
        {
            throw TaskAreaValidationException.ForField("Id", "Không thể xóa lĩnh vực hệ thống.");
        }

        var tasksUsingArea = await areaRepository.GetTasksUsingAreaAsync(id, cancellationToken);
        if (tasksUsingArea.Count > 0)
        {
            if (request.ReplacementAreaId is null)
            {
                throw new TaskAreaInUseException(tasksUsingArea.Count);
            }

            var replacement = await areaRepository.GetByIdAsync(
                request.ReplacementAreaId.Value,
                cancellationToken
            );
            if (replacement is null)
            {
                throw TaskAreaValidationException.ForField("ReplacementAreaId", "Không tìm thấy lĩnh vực để chuyển sang.");
            }
            if (replacement.Id == id)
            {
                throw TaskAreaValidationException.ForField("ReplacementAreaId", "Không thể chuyển sang chính lĩnh vực đang xóa.");
            }

            foreach (var task in tasksUsingArea)
            {
                task.AreaId = replacement.Id;
            }
        }

        areaRepository.Remove(area);
        await areaRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static TaskAreaResponse ToResponse(TaskArea area) =>
        new(area.Id, area.NameVi, area.NameEn, area.IsSystem, area.SortOrder, area.Tasks.Count);
}
