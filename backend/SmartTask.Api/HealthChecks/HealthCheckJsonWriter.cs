using System.Text.Json;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace SmartTask.Api.HealthChecks;

/// <summary>
/// ASP.NET Core's default HealthCheckOptions.ResponseWriter writes plain
/// text ("Healthy"/"Unhealthy"), not JSON — this gives GET /health and
/// GET /health/db the simple `{"status": "Healthy"}` shape instead. Never
/// includes exception details/messages in the response (see
/// DatabaseHealthCheck's own doc comment on why) — only the status word.
/// </summary>
public static class HealthCheckJsonWriter
{
    public static Task Write(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json";
        var status = report.Status == HealthStatus.Healthy ? "Healthy" : "Unhealthy";
        return context.Response.WriteAsync(JsonSerializer.Serialize(new { status }));
    }
}
