using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Configuración de Logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// Configuración de YARP Reverse Proxy
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

// Configuración de Rate Limiting (Protección contra DDoS y abusos)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 120, // 120 peticiones por minuto por IP
                QueueLimit = 20,
                Window = TimeSpan.FromMinutes(1)
            }));
});

// Configuración de JWT para validación inicial opcional en Gateway
var jwtKey = builder.Configuration["Jwt:Key"] ?? "ClimaSafe_Secret_Key_Super_Secure_2026_UMG_VillaCanales!";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "ClimaSafeAuthService",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

// Configuración de CORS para Frontend Angular
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Middleware de Logging Centralizado
app.Use(async (context, next) =>
{
    var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
    var start = DateTime.UtcNow;
    logger.LogInformation("[GATEWAY IN] {Method} {Path} from {IP}", 
        context.Request.Method, context.Request.Path, context.Connection.RemoteIpAddress);

    await next();

    var elapsed = (DateTime.UtcNow - start).TotalMilliseconds;
    logger.LogInformation("[GATEWAY OUT] {Method} {Path} -> Status {StatusCode} ({Elapsed:F1}ms)", 
        context.Request.Method, context.Request.Path, context.Response.StatusCode, elapsed);
});

// Health check del Gateway
app.MapGet("/health", () => Results.Ok(new
{
    status = "Healthy",
    service = "API Gateway (ASP.NET Core 10 & YARP)",
    timestamp = DateTime.UtcNow,
    architecture = "Microservicios Fase 3"
}));

app.UseCors("AllowAll");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Mapear rutas de YARP
app.MapReverseProxy();

app.Run();
