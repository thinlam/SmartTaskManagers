namespace SmartTask.Application.Tasks;

public sealed class TaskAreaValidationException(string field, string message) : Exception(message)
{
    public string Field { get; } = field;

    public static TaskAreaValidationException ForField(string field, string message) =>
        new(field, message);
}
