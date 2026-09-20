using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SmartTask.Application.Abstractions;
using SmartTask.Infrastructure.Security;
using SmartTask.Infrastructure.Time;

namespace SmartTask.Infrastructure;

/// <summary>Composition root calls this once from Program.cs — keeps registration details out of the Api layer.</summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.AddSingleton<IPasswordHasher, PasswordHasherAdapter>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();

        return services;
    }
}
