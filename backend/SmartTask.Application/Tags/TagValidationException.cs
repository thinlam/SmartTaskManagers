namespace SmartTask.Application.Tags;

/// <summary>Same shape as SmartTask.Application.Tasks.TaskValidationException — field-keyed messages for a 422 ValidationProblem.</summary>
public sealed class TagValidationException(IDictionary<string, string[]> errors) : Exception
{
    public IDictionary<string, string[]> Errors { get; } = errors;

    public static TagValidationException ForField(string field, string message) =>
        new(new Dictionary<string, string[]> { [field] = [message] });
}
