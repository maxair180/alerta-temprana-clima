using ClimaApi.Data;
using ClimaApi.Models;
using Microsoft.EntityFrameworkCore;

namespace ClimaApi.Services;

public class SimuladorSensoresService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly Random _random = new();

    public SimuladorSensoresService(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var alertaService = scope.ServiceProvider.GetRequiredService<AlertaService>();

                var sensores = await context.Sensores.Where(s => s.Estado).ToListAsync(stoppingToken);

                foreach (var sensor in sensores)
                {
                    decimal valorSimulado = sensor.TipoSensor.ToLower() switch
                    {
                        "temperatura" => _random.Next(-5, 45),
                        "humedad" => _random.Next(20, 100),
                        "viento" => _random.Next(0, 85),
                        "lluvia" => _random.Next(0, 100),
                        "nivelrio" => _random.Next(0, 90),
                        _ => _random.Next(0, 100)
                    };

                    var lectura = new Lectura
                    {
                        SensorId = sensor.Id,
                        Valor = valorSimulado,
                        FechaHora = DateTime.UtcNow
                    };

                    context.Lecturas.Add(lectura);
                    await context.SaveChangesAsync(stoppingToken);

                    // Procesar la lectura en el motor de alertas
                    await alertaService.EvaluarLecturaAsync(lectura);
                }
            }

            // Esperar 10 segundos antes de generar la siguiente lectura
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
    }
}