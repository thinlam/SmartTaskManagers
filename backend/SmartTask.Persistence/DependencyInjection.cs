using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SmartTask.Application.Goals;
using SmartTask.Application.Habits;
using SmartTask.Application.Notifications;
using SmartTask.Application.Projects;
using SmartTask.Application.Tasks;
using SmartTask.Application.Users;
using SmartTask.Persistence.Repositories;

namespace SmartTask.Persistence;

/// <summary>
/// Registers AppDbContext against the "DefaultConnection" connection
/// string plus the repositories implemented against it. The base
/// SmartTask.Api/appsettings.json deliberately has no ConnectionStrings
/// section at all — the value comes from local user-secrets/env vars
/// (local dev MySQL) or, in production, the
/// ConnectionStrings__DefaultConnection environment variable (Railway),
/// never a committed file with real credentials — see backend/README.md.
///
/// ServerVersion is a fixed value (from "Database:ServerVersion",
/// defaulting to MySQL 8.0) instead of ServerVersion.AutoDetect:
/// AutoDetect opens a real connection every cold start and, more
/// importantly, makes `dotnet ef migrations add` fail when no MySQL
/// instance is reachable (design-time model building runs the options
/// lambda). A fixed version works offline and is what the generated
/// DDL targets. EF Core doesn't actually open a connection at
/// registration time, only when a DbContext is first used — so this
/// builds and the app starts fine even without a live MySQL instance.
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

        var serverVersionString = configuration["Database:ServerVersion"] ?? "8.0.0-mysql";
        var serverVersion = ServerVersion.Parse(serverVersionString);

        services.AddDbContext<AppDbContext>(options =>
            options.UseMySql(connectionString, serverVersion)
        );
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ITaskRepository, TaskRepository>();
        services.AddScoped<IProjectRepository, ProjectRepository>();
        services.AddScoped<IGoalRepository, GoalRepository>();
        services.AddScoped<IHabitRepository, HabitRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();

        return services;
    }
}
