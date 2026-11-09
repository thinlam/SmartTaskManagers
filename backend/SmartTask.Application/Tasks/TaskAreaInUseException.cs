namespace SmartTask.Application.Tasks;

/// <summary>Thrown by TaskAreaService.DeleteAsync when the area still has tasks and no ReplacementAreaId was given — the controller maps this to 409 so the client can ask which area to move them to.</summary>
public sealed class TaskAreaInUseException(int taskCount)
    : Exception($"Lĩnh vực này đang được {taskCount} công việc dùng. Chọn lĩnh vực để chuyển sang.")
{
    public int TaskCount { get; } = taskCount;
}
