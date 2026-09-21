using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using SmartTask.Application.Auth;
using SmartTask.Application.Goals;
using SmartTask.Application.Habits;
using SmartTask.Application.Projects;
using SmartTask.Application.Sync;
using SmartTask.Application.Tasks;
using SmartTask.Infrastructure;
using SmartTask.Infrastructure.Security;
using SmartTask.Persistence;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder
    .Services.AddControllers()
    // Enums serialize/bind as strings ("Critical"), not ints — matches
    // the string storage decision Phase 21 already made in Persistence's
    // EntityTypeConfiguration classes, so the API and the database agree
    // on what a lookup value looks like.
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter())
    );
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi(options =>
{
    // Lets Swagger UI's "Authorize" button send a Bearer token on every
    // [Authorize] endpoint — without this, the OpenAPI doc has no
    // security scheme and Swagger UI has no way to attach the header.
    options.AddDocumentTransformer(
        (document, _, _) =>
        {
            document.Components ??= new OpenApiComponents();
            document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
            document.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                Description = "Paste the token from POST /api/auth/login or /api/auth/register — no \"Bearer \" prefix needed here.",
            };
            document.Security ??= new List<OpenApiSecurityRequirement>();
            document.Security.Add(
                new OpenApiSecurityRequirement
                {
                    [new OpenApiSecuritySchemeReference("Bearer", document)] = [],
                }
            );
            return Task.CompletedTask;
        }
    );
});

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddPersistence(builder.Configuration);
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<IGoalService, GoalService>();
builder.Services.AddScoped<IHabitService, HabitService>();
builder.Services.AddScoped<ISyncService, SyncService>();

// JWT validation (incoming requests) — token *issuance* is
// SmartTask.Infrastructure.Security.JwtTokenGenerator; this is the
// other half, checking a Bearer token on [Authorize] endpoints.
var jwtSection = builder.Configuration.GetSection(JwtOptions.SectionName);
var jwtSecret =
    jwtSection["Secret"]
    ?? throw new InvalidOperationException(
        "Missing 'Jwt:Secret'. Set it with `dotnet user-secrets set \"Jwt:Secret\" \"<value>\"` "
            + "inside SmartTask.Api — never put a real signing secret in appsettings.json."
    );

builder
    .Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidateAudience = true,
            ValidAudience = jwtSection["Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
        };
    });
builder.Services.AddAuthorization();

// Phase 27 — apps/desktop's Vite dev server (localhost:5173) and the
// packaged Tauri window both call this API from the browser/webview, so
// it needs an explicit CORS policy; without one, every request from
// the desktop app fails at the browser level before it even reaches a
// controller. Named, not AllowAnyOrigin — this API isn't meant to be
// called from an arbitrary website.
const string DesktopCorsPolicy = "DesktopClient";
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        DesktopCorsPolicy,
        policy =>
            policy
                .WithOrigins("http://localhost:5173", "tauri://localhost", "http://tauri.localhost")
                .AllowAnyHeader()
                .AllowAnyMethod()
    );
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    // Swagger UI only — the doc itself is Microsoft.AspNetCore.OpenApi's
    // (MapOpenApi above), not Swashbuckle's own generator. Browse
    // http://localhost:5277/swagger, click "Authorize", paste a token
    // from /api/auth/login to try [Authorize] endpoints interactively.
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "SmartTask.Api v1");
        options.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();

// Before Authentication — the browser's preflight OPTIONS request carries
// no Authorization header, so CORS has to be resolved before the auth
// middleware would otherwise reject it.
app.UseCors(DesktopCorsPolicy);

// Authentication before Authorization — order matters, ASP.NET Core won't warn you if it's backwards.
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
