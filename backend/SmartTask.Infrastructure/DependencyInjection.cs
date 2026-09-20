using Microsoft.Extensions.DependencyInjection;
using SmartTask.Application.Abstractions;
using SmartTask.Infrastructure.Time;

namespace SmartTask.Infrastructure;

/// <summary>Composition root calls this once from Program.cs — keeps registration details out of the Api layer.</summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();
        return services;
    }
}
