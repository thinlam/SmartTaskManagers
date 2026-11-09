namespace SmartTask.Application.Tasks;

/// <summary>
/// Thrown by CompleteAsync/DeleteAsync when the task has incomplete subtasks and the
/// caller hasn't said how to handle them yet. The controller maps this to 409 Conflict
/// with enough payload for the client to ask the user and retry with a confirmed choice.
/// </summary>
public sealed class TaskActionRequiresConfirmationException(
    string action,
    string message,
    IReadOnlyList<Guid> subtaskIds
) : Exception(message)
{
    /// <summary>"complete" or "delete".</summary>
    public string Action { get; } = action;
    public IReadOnlyList<Guid> SubtaskIds { get; } = subtaskIds;
}
