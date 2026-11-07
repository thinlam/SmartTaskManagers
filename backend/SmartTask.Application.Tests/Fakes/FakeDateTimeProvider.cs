using SmartTask.Application.Abstractions;

namespace SmartTask.Application.Tests.Fakes;

/// <summary>Fixed clock — tests pin UtcNow instead of racing the real one.</summary>
public sealed class FakeDateTimeProvider(DateTimeOffset utcNow) : IDateTimeProvider
{
    public DateTimeOffset UtcNow { get; set; } = utcNow;
}
