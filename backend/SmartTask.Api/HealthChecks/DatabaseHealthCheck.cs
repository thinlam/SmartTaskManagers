using Microsoft.Extensions.Diagnostics.HealthChecks;
using SmartTask.Persistence;

namespace SmartTask.Api.HealthChecks;

/// <summary>
/// Backs GET /health/db — a real connectivity check (opens a connection
/// and pings the server), not just "did DbContext construct". Deliberately
/// only in SmartTask.Api (the composition root) rather than Application/
/// Persistence — this is an ASP.NET Core hosting concern (IHealthCheck),
/// not a use case, so it doesn't belong behind the repository
/// abstractions the rest of the app depends on.
/// </summary>
public sealed class DatabaseHealthCheck(AppDbContext dbContext) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            var canConnect = await dbContext.Database.CanConnectAsync(cancellationToken);
            return canConnect
                ? HealthCheckResult.Healthy("Database connection succeeded.")
                : HealthCheckResult.Unhealthy("Database connection failed.");
        }
        catch (Exception ex)
        {
            // Never put ex.Message (can contain server/host details) or
            // the connection string in the response — only in the log.
            return HealthCheckResult.Unhealthy("Database connection failed.", ex);
        }
    }
}
