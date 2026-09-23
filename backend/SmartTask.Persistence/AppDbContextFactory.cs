using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using SmartTask.Application.Abstractions;

namespace SmartTask.Persistence;

/// <summary>
/// Design-time factory for `dotnet ef` (migrations add/remove/script).
/// The app's real connection string is never committed — it comes from
/// user-secrets locally or ConnectionStrings__DefaultConnection on
/// Railway — so design-time model building can't use the app's service
/// provider (it would throw "Missing connection string"). This factory
/// gives the CLI a parseable MySQL connection string instead. It is
/// DESIGN-TIME ONLY: EF tools never open a connection while building the
/// model, and at runtime the app ignores this factory entirely (it uses
/// the AddPersistence configuration). The value here is a placeholder,
/// not a real credential.
/// </summary>
public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connectionString =
            Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Server=localhost;Port=3306;Database=SmartTask;User=root;Password=placeholder";

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseMySql(connectionString, ServerVersion.Parse("8.0.0-mysql"))
            .Options;

        // Provide a stub CurrentUserContext for design-time use (migrations).
        // At runtime, this factory is never used — the app's DI container
        // provides the real context via AddPersistence.
        var stubContext = new StubCurrentUserContext();
        return new AppDbContext(options, stubContext);
    }

    /// <summary>
    /// Stub implementation of ICurrentUserContext for design-time use.
    /// Since migrations don't run queries with per-user filters, UserId
    /// can remain null without affecting schema generation.
    /// </summary>
    private sealed class StubCurrentUserContext : ICurrentUserContext
    {
        public Guid? UserId { get; set; }
    }
}