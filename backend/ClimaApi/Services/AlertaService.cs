using ClimaApi.Data;
using ClimaApi.Models;
using ClimaApi.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace ClimaApi.Services;

public class AlertaService
{
    private readonly ApplicationDbContext _context;
    private readonly IHubContext<ClimaHub> _hubContext;

    public AlertaService(ApplicationDbContext context, IHubContext<ClimaHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    public async Task EvaluarLecturaAsync(Lectura lectura)
    {
        var sensor = await _context.Sensores.FindAsync(lectura.SensorId);
        if (sensor == null || !sensor.Estado) return;

        string nivelRiesgo = "Verde";
        string mensaje = "Condiciones normales";
        string? fenomeno = null;

        // Reglas de evaluación según el tipo de sensor
        switch (sensor.TipoSensor.ToLower())
        {
            case "temperatura":
                if (lectura.Valor >= 40) { nivelRiesgo = "Rojo"; mensaje = "Temperatura extrema crítica"; fenomeno = "Incendio forestal"; }
                else if (lectura.Valor >= 35) { nivelRiesgo = "Naranja"; mensaje = "Calor alto de precaución"; fenomeno = "Incendio forestal"; }
                else if (lectura.Valor <= 0) { nivelRiesgo = "Rojo"; mensaje = "Temperatura bajo cero"; fenomeno = "Helada"; }
                else if (lectura.Valor <= 5) { nivelRiesgo = "Amarillo"; mensaje = "Baja temperatura"; fenomeno = "Helada"; }
                break;

            case "nivelrio":
            case "lluvia":
                if (lectura.Valor >= 80) { nivelRiesgo = "Rojo"; mensaje = "Riesgo inminente de desbordamiento/inundación"; fenomeno = "Inundacion"; }
                else if (lectura.Valor >= 60) { nivelRiesgo = "Naranja"; mensaje = "Nivel de agua en aumento rápido"; fenomeno = "Tormenta"; }
                else if (lectura.Valor >= 40) { nivelRiesgo = "Amarillo"; mensaje = "Lluvia constante observada"; fenomeno = "Tormenta"; }
                else if (lectura.Valor <= 5 && sensor.TipoSensor.ToLower() == "nivelrio") { nivelRiesgo = "Amarillo"; mensaje = "Nivel de río extremadamente bajo"; fenomeno = "Sequia"; }
                break;

            case "viento":
                if (lectura.Valor >= 70) { nivelRiesgo = "Rojo"; mensaje = "Vientos de fuerza de huracán/tormenta"; fenomeno = "Tormenta"; }
                else if (lectura.Valor >= 45) { nivelRiesgo = "Naranja"; mensaje = "Vientos fuertes de alerta"; fenomeno = "Tormenta"; }
                break;
        }

        // Registrar la alerta
        var nuevaAlerta = new Alerta
        {
            SensorId = sensor.Id,
            NivelRiesgo = nivelRiesgo,
            Mensaje = mensaje,
            ValorRegistrado = lectura.Valor,
            FechaHora = DateTime.UtcNow
        };
        _context.Alertas.Add(nuevaAlerta);
        await _context.SaveChangesAsync();

        // Registrar en Historial de Eventos si hay fenómeno detectado
        if (!string.IsNullOrEmpty(fenomeno))
        {
            var historial = new HistorialEvento
            {
                AlertaId = nuevaAlerta.Id,
                TipoFenomeno = fenomeno,
                Descripcion = mensaje,
                NivelGravedad = nivelRiesgo,
                FechaHora = DateTime.UtcNow
            };
            _context.HistorialEventos.Add(historial);
            await _context.SaveChangesAsync();
        }

        // Notificar en tiempo real mediante SignalR
        await _hubContext.Clients.All.SendAsync("RecibirLectura", new
        {
            SensorId = sensor.Id,
            SensorNombre = sensor.Nombre,
            TipoSensor = sensor.TipoSensor,
            Valor = lectura.Valor,
            NivelRiesgo = nivelRiesgo,
            Mensaje = mensaje,
            FechaHora = lectura.FechaHora
        });
    }
}