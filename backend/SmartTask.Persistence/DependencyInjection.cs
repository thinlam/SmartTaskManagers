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
/// section at all — the value comes from appsettings.Development.json
/// (local dev, DESKTOP-CKNT19A\SQLEXPRESS) or, in production, the
/// ConnectionStrings__DefaultConnection environment variable (Railway),
/// never a committed file — see backend/README.md's "Cài trên nhiều máy"
/// and "Bug thật gặp khi deploy Railway" sections. EF Core doesn't
/// actually open a connection at registration time, only when a
/// DbContext is first used — so this builds and the app starts fine even
/// without a live SQL Server instance.
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
        services.AddScoped<INotificationRepository, NotificationRepository>();

        return services;
    }
}
