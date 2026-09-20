using SmartTask.Application.Abstractions;

namespace SmartTask.Infrastructure.Time;

/// <summary>Real implementation of Application's IDateTimeProvider — the only thing Infrastructure adds this phase.</summary>
public sealed class SystemDateTimeProvider : IDateTimeProvider
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
