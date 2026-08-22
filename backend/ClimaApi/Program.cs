using ClimaApi.Data;
using ClimaApi.Hubs;
using ClimaApi.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Base de Datos
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAngular");
app.UseHttpsRedirection();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ClimaHub>("/climaHub"); // Endpoint de SignalR

app.Run();