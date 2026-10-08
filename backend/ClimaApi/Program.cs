using ClimaApi.Data;
using ClimaApi.Hubs;
using ClimaApi.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi(); // Nativo de .NET 10

// Base de Datos
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configuración JWT
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
    };
});

// SignalR y Servicios de Negocio
builder.Services.AddSignalR();
builder.Services.AddScoped<AlertaService>();
builder.Services.AddHostedService<SimuladorSensoresService>();

// CORS para permitir peticiones desde Angular
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    try {
        context.Database.Migrate();
        // Seed básico si no hay usuarios
        if (!context.Usuarios.Any())
        {
            context.Usuarios.Add(new ClimaApi.Models.Usuario { 
                Nombre = "Admin Inicial", 
                Email = "admin@clima.gt", 
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin2026!"), 
                Rol = "Administrador", 
                Estado = true, 
                FechaCreacion = DateTime.UtcNow 
            });
            context.Comunidades.Add(new ClimaApi.Models.Comunidad {
                Nombre = "Villa Canales", Municipio = "Villa Canales", Departamento = "Guatemala", Pais = "Guatemala", CoordenadasGeograficas = "14.482,-90.534", Descripcion = "Central", Estado = true
            });
            context.SaveChanges();
            
            // Sensor base
            var comunidad = context.Comunidades.First();
            context.Sensores.Add(new ClimaApi.Models.Sensor {
                Nombre = "Sensor Base", Codigo = "SENS-01", TipoSensor = "Temperatura", ComunidadId = comunidad.Id, Ubicacion = "Centro", UnidadMedida = "°C", Estado = true, FechaInstalacion = DateTime.UtcNow, Descripcion = "Sensor inicial"
            });
            context.SaveChanges();
        }
    } catch (Exception ex) {
        Console.WriteLine($"Error aplicando migraciones: {ex.Message}");
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowAngular");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ClimaHub>("/hubs/climaHub"); // Endpoint de SignalR

app.Run();