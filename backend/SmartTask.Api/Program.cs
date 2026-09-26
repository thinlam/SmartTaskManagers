using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using SmartTask.Api.BackgroundServices;
using SmartTask.Api.HealthChecks;
using SmartTask.Application.Abstractions;
using SmartTask.Application.Auth;
using SmartTask.Application.Goals;
using SmartTask.Application.Habits;
using SmartTask.Application.Notifications;
using SmartTask.Application.Projects;
using SmartTask.Application.SmartEngine;
using SmartTask.Application.Sync;
using SmartTask.Application.Tasks;
using SmartTask.Infrastructure;
using SmartTask.Infrastructure.Security;
using SmartTask.Persistence;

var builder = WebApplication.CreateBuilder(args);

// ============================================================
// CONTROLLERS + JSON
// ============================================================

builder
    .Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Serialize/bind enum dưới dạng string:
        // "Critical", "Completed", ...
        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter()
        );
    });

// ============================================================
// OPENAPI / SWAGGER
// ============================================================

builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer(
        (document, _, _) =>
        {
            document.Components ??= new OpenApiComponents();

            document.Components.SecuritySchemes ??=
                new Dictionary<string, IOpenApiSecurityScheme>();

            document.Components.SecuritySchemes["Bearer"] =
                new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Description =
                        "Paste token from POST /api/auth/login " +
                        "or /api/auth/register. " +
                        "Không cần thêm prefix \"Bearer \".",
                };

            document.Security ??=
                new List<OpenApiSecurityRequirement>();

            document.Security.Add(
                new OpenApiSecurityRequirement
                {
                    [
                        new OpenApiSecuritySchemeReference(
                            "Bearer",
                            document
                        )
                    ] = [],
                }
            );

            return Task.CompletedTask;
        }
    );
});

// ============================================================
// APPLICATION / INFRASTRUCTURE / PERSISTENCE
// ============================================================

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddPersistence(builder.Configuration);

// ============================================================
// APPLICATION SERVICES
// ============================================================

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<IGoalService, GoalService>();
builder.Services.AddScoped<IHabitService, HabitService>();
builder.Services.AddScoped<ISyncService, SyncService>();
builder.Services.AddScoped<ISmartEngineService, SmartEngineService>();
builder.Services.AddScoped<INotificationService, NotificationService>();

// ============================================================
// BACKGROUND SERVICES
// ============================================================

builder.Services.AddHostedService<DailySmartRecalcHostedService>();
builder.Services.AddHostedService<NotificationGenerationHostedService>();

// ============================================================
// HEALTH CHECK
// ============================================================

builder.Services
    .AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>(
        "database",
        tags: ["db"]
    );

// ============================================================
// JWT AUTHENTICATION
// ============================================================

var jwtSection =
    builder.Configuration.GetSection(JwtOptions.SectionName);

var jwtSecret =
    jwtSection["Secret"]
    ?? throw new InvalidOperationException(
        "Missing 'Jwt:Secret'. " +
        "Set Jwt__Secret in Railway Variables or use user-secrets locally."
    );

builder
    .Services.AddAuthentication(
        JwtBearerDefaults.AuthenticationScheme
    )
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = jwtSection["Issuer"],

                ValidateAudience = true,
                ValidAudience = jwtSection["Audience"],

                ValidateIssuerSigningKey = true,
                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtSecret)
                    ),

                ValidateLifetime = true,

                // Token hết hạn là hết hạn ngay,
                // không cộng thêm mặc định 5 phút.
                ClockSkew = TimeSpan.Zero,
            };
    });

builder.Services.AddAuthorization();

// ============================================================
// CORS
// ============================================================

const string FrontendCorsPolicy = "FrontendClient";

// Tauri desktop app origins are fixed in code, not config — Railway's
// index-based array env vars (Cors__AllowedOrigins__0, __1, ...)
// overwrite appsettings.json entries by position, which previously
// wiped out "tauri://localhost" whenever an extra web origin was
// configured on Railway. Keeping these hardcoded makes them immune
// to that overwrite.
var fixedOrigins = new[] { "tauri://localhost", "http://tauri.localhost" };

var configuredOrigins =
    builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>()
    ?? [];

// Local development fallback.
//
// Production KHÔNG tự động AllowAnyOrigin.
// Railway phải khai báo:
// Cors__AllowedOrigins__0=https://domain.vercel.app
if (builder.Environment.IsDevelopment() &&
    configuredOrigins.Length == 0)
{
    configuredOrigins =
    [
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ];
}

var allowedOrigins =
    fixedOrigins
        .Concat(configuredOrigins)
        .Distinct()
        .ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy(
        FrontendCorsPolicy,
        policy =>
        {
            if (allowedOrigins.Length > 0)
            {
                policy
                    .WithOrigins(allowedOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            }
        }
    );
});

// ============================================================
// BUILD APP
// ============================================================

var app = builder.Build();

// ============================================================
// STARTUP INFORMATION
// ============================================================

app.Logger.LogInformation(
    "Environment: {Environment}",
    app.Environment.EnvironmentName
);

if (allowedOrigins.Length == 0)
{
    app.Logger.LogWarning(
        "Cors:AllowedOrigins is empty. " +
        "Cross-origin browser requests will be rejected. " +
        "Set Cors__AllowedOrigins__0 in Railway Variables."
    );
}
else
{
    foreach (var origin in allowedOrigins)
    {
        app.Logger.LogInformation(
            "CORS allowed origin: {Origin}",
            origin
        );
    }
}

// ============================================================
// DATABASE MIGRATION
// ============================================================
//
// Railway:
// API và MySQL có thể start không cùng thời điểm.
// Retry migration trước khi coi startup thất bại.
//

{
    const int maxAttempts = 5;

    for (var attempt = 1; ; attempt++)
    {
        try
        {
            using var migrationScope =
                app.Services.CreateScope();

            var dbContext =
                migrationScope.ServiceProvider
                    .GetRequiredService<AppDbContext>();

            app.Logger.LogInformation(
                "Running database migrations..."
            );

            await dbContext.Database.MigrateAsync();

            app.Logger.LogInformation(
                "Database migrations completed successfully."
            );

            break;
        }
        catch (Exception ex)
            when (attempt < maxAttempts)
        {
            var delaySeconds = attempt * 3;

            app.Logger.LogWarning(
                ex,
                "Migration attempt {Attempt}/{MaxAttempts} failed. " +
                "Retrying in {DelaySeconds} seconds.",
                attempt,
                maxAttempts,
                delaySeconds
            );

            await Task.Delay(
                TimeSpan.FromSeconds(delaySeconds)
            );
        }
    }
}

// ============================================================
// EXCEPTION HANDLING
// ============================================================

if (app.Environment.IsDevelopment())
{
    // OpenAPI JSON
    app.MapOpenApi();

    // Swagger UI
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint(
            "/openapi/v1.json",
            "SmartTask.Api v1"
        );

        options.RoutePrefix = "swagger";
    });
}
else
{
    app.UseExceptionHandler(errorApp =>
    {
        errorApp.Run(async context =>
        {
            var exception =
                context.Features
                    .Get<IExceptionHandlerFeature>()
                    ?.Error;

            context
                .RequestServices
                .GetRequiredService<ILogger<Program>>()
                .LogError(
                    exception,
                    "Unhandled exception processing {Method} {Path}",
                    context.Request.Method,
                    context.Request.Path
                );

            context.Response.StatusCode =
                StatusCodes.Status500InternalServerError;

            context.Response.ContentType =
                "application/json";

            await context.Response.WriteAsJsonAsync(
                new
                {
                    message =
                        "An unexpected error occurred."
                }
            );
        });
    });
}

// ============================================================
// HTTPS
// ============================================================
//
// Railway xử lý HTTPS ở reverse proxy.
//
// Browser
//    ↓ HTTPS
// Railway
//    ↓ HTTP :8080
// ASP.NET Core
//
// Vì vậy Production không cần UseHttpsRedirection().
//
// Local Development vẫn dùng được HTTPS.
//

if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// ============================================================
// CORS
// ============================================================
//
// CORS phải đứng trước Authentication / Authorization.
// Preflight OPTIONS không gửi JWT.
//

app.UseCors(FrontendCorsPolicy);

// ============================================================
// AUTHENTICATION / AUTHORIZATION
// ============================================================

app.UseAuthentication();
app.UseAuthorization();

// ============================================================
// CURRENT USER CONTEXT
// ============================================================
//
// Must run after UseAuthentication/UseAuthorization — that's what
// populates HttpContext.User's claims. AppDbContext's query filter
// (see SmartTask.Persistence/AppDbContext.cs) reads this per request
// to scope every Task/Project/Goal/Habit/Notification/Session query to
// the caller. Left null (never set) for unauthenticated requests — the
// filter then matches nothing, not everything. Also validates the
// request's session (see SmartTask.Domain.Auth.Session) hasn't been
// revoked — this is what makes Sign Out, changing your password, and
// revoking a session from Active Sessions actually take effect
// immediately instead of just updating a database row nobody checks.
//

app.Use(
    async (context, next) =>
    {
        var userIdClaim = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            await next(context);
            return;
        }

        var currentUserContext = context.RequestServices.GetRequiredService<ICurrentUserContext>();
        currentUserContext.UserId = userId;

        var jtiClaim = context.User.FindFirstValue(JwtRegisteredClaimNames.Jti);
        if (!Guid.TryParse(jtiClaim, out var sessionId))
        {
            // A token with no jti (shouldn't happen for tokens issued
            // after this change, but a token minted before this feature
            // existed has none) — treat it as having no active session
            // rather than throwing.
            await next(context);
            return;
        }

        var sessionRepository = context.RequestServices.GetRequiredService<ISessionRepository>();
        var session = await sessionRepository.GetByIdAsync(sessionId, context.RequestAborted);
        if (session is null || session.RevokedAt is not null)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        currentUserContext.SessionId = sessionId;

        if (DateTimeOffset.UtcNow - session.LastActiveAt > TimeSpan.FromMinutes(1))
        {
            session.LastActiveAt = DateTimeOffset.UtcNow;
            await sessionRepository.SaveChangesAsync(context.RequestAborted);
        }

        await next(context);
    }
);

// ============================================================
// ROOT ENDPOINT
// ============================================================
//
// Dùng để test Railway:
// https://smarttaskmanagers-production.up.railway.app/
//

app.MapGet(
    "/",
    () =>
        Results.Ok(
            new
            {
                service = "SmartTask API",
                status = "running",
                environment =
                    app.Environment.EnvironmentName,
                timestamp =
                    DateTimeOffset.UtcNow
            }
        )
);

// ============================================================
// HEALTH CHECK ENDPOINTS
// ============================================================

// Chỉ kiểm tra API process.
//
// GET /health
app.MapHealthChecks(
    "/health",
    new HealthCheckOptions
    {
        Predicate = _ => false,
        ResponseWriter =
            HealthCheckJsonWriter.Write
    }
);

// Kiểm tra database.
//
// GET /health/db
app.MapHealthChecks(
    "/health/db",
    new HealthCheckOptions
    {
        Predicate =
            check => check.Tags.Contains("db"),

        ResponseWriter =
            HealthCheckJsonWriter.Write,
    }
);

// ============================================================
// CONTROLLERS
// ============================================================

app.MapControllers();

// ============================================================
// RUN
// ============================================================

app.Run();