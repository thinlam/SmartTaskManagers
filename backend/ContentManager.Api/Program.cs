using System.Text;
using System.Text.Json.Serialization;
using ContentManager.Api.Data;
using ContentManager.Api.Endpoints;
using ContentManager.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenant, HttpTenant>();
builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(ResolveConnectionString(builder.Configuration)));

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.AddSingleton<TokenService>();

var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
if (jwt.Secret.Length < 32)
    throw new InvalidOperationException("Jwt:Secret must be at least 32 characters (set Jwt__Secret).");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidIssuer = jwt.Issuer,
        ValidateAudience = true, ValidAudience = jwt.Audience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
    });
builder.Services.AddAuthorization();

// Web dev server, Tauri (tauri://localhost, http://tauri.localhost) and Capacitor (https://localhost).
var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins([.. origins, "tauri://localhost", "http://tauri.localhost", "https://tauri.localhost", "https://localhost", "http://localhost"])
    .AllowAnyHeader().AllowAnyMethod()));

builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = 120L * 1024 * 1024);
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 120L * 1024 * 1024);

builder.Services.AddHealthChecks();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    if (app.Configuration.GetValue<bool>("Seed:Demo")) await DemoSeeder.SeedAsync(db);
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapAuth();
app.MapContents();
app.MapMisc(app.Configuration);
app.MapDashboard();

app.Run();

// Railway exposes Postgres as DATABASE_URL (postgres://user:pass@host:port/db); Npgsql wants key=value.
static string ResolveConnectionString(IConfiguration config)
{
    var url = config["DATABASE_URL"];
    if (string.IsNullOrWhiteSpace(url))
        return config.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Missing ConnectionStrings:Default or DATABASE_URL.");

    var uri = new Uri(url);
    var user = uri.UserInfo.Split(':', 2);
    return new Npgsql.NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Database = uri.AbsolutePath.TrimStart('/'),
        Username = Uri.UnescapeDataString(user[0]),
        Password = user.Length > 1 ? Uri.UnescapeDataString(user[1]) : "",
    }.ConnectionString;
}

public partial class Program;
