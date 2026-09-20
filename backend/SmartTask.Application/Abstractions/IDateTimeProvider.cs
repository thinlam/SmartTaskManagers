namespace SmartTask.Application.Abstractions;

/// <summary>
/// Application defines the contract, Infrastructure implements it
/// (<c>SystemDateTimeProvider</c>) — the standard Clean Architecture
/// example for proving DI composes correctly across all 4 layers before
/// any real business logic exists. Also the reason "now" is testable
/// later: use cases depend on this interface, never <c>DateTime.UtcNow</c>
/// directly.
/// </summary>
public interface IDateTimeProvider
{
    DateTimeOffset UtcNow { get; }
}
