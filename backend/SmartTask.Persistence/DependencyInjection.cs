using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SmartTask.Application.Goals;
using SmartTask.Application.Habits;
using SmartTask.Application.Projects;
using SmartTask.Application.Tasks;
using SmartTask.Application.Users;
using SmartTask.Persistence.Repositories;

namespace SmartTask.Persistence;

/// <summary>
/// Registers AppDbContext against the "DefaultConnection" connection
/// string (see SmartTask.Api/appsettings.json) plus the repositories
/// implemented against it. EF Core doesn't actually open a connection at
/// registration time, only when a DbContext is first used — so this
/// builds and the app starts fine even without a live SQL Server
/// instance.
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
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ITaskRepository, TaskRepository>();
        services.AddScoped<IProjectRepository, ProjectRepository>();
        services.AddScoped<IGoalRepository, GoalRepository>();
        services.AddScoped<IHabitRepository, HabitRepository>();

        return services;
    }
}
