using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace SmartTask.Persistence;

/// <summary>
/// Registers AppDbContext against the "DefaultConnection" connection
/// string (see SmartTask.Api/appsettings.json). EF Core doesn't actually
/// open a connection at registration time, only when a DbContext is
/// first used — so this builds and the app starts fine even without a
/// live SQL Server instance; real connectivity is exercised once Phase
/// 21 adds migrations.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddPersistence(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        var connectionString =
            configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "Missing 'ConnectionStrings:DefaultConnection' — see SmartTask.Api/appsettings.json."
            );

        services.AddDbContext<AppDbContext>(options => options.UseSqlServer(connectionString));
        return services;
    }
}
