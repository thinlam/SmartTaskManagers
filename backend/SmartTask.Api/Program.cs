using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using SmartTask.Application.Auth;
using SmartTask.Infrastructure;
using SmartTask.Infrastructure.Security;
using SmartTask.Persistence;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddPersistence(builder.Configuration);
builder.Services.AddScoped<IAuthService, AuthService>();

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

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// Authentication before Authorization — order matters, ASP.NET Core won't warn you if it's backwards.
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
