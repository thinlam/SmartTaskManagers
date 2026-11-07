namespace SmartTask.Application.Tasks;

/// <summary>
/// Cross-field business rules TaskService enforces that DataAnnotations
/// can't express (DueDate vs StartDate, ReminderAt vs DueDate, subtask
/// depth, tag count...). Carries per-field messages so TasksController
/// can return a 422 shaped like ASP.NET's own ValidationProblem — the
/// spec's "API trả lỗi theo từng trường (400/422)" requirement.
/// </summary>
public sealed class TaskValidationException(IDictionary<string, string[]> errors) : Exception
{
    public IDictionary<string, string[]> Errors { get; } = errors;

    public static TaskValidationException ForField(string field, string message) =>
        new(new Dictionary<string, string[]> { [field] = [message] });
}
