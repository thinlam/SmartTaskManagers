namespace SmartTask.Application.Health;

/// <summary>
/// DTO for GET /api/health — proves a real request can flow
/// Api → Application → Infrastructure (via IDateTimeProvider) and back.
/// Not a stand-in for real Tasks/Projects/Goals/Habits use cases, which
/// land once Phase 21 (schema) and Phase 23-26 (CRUD APIs) exist.
/// </summary>
public sealed record ApiHealthReport(string Status, DateTimeOffset ServerTimeUtc);
