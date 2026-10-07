using ClimaApi.Data;
using ClimaApi.Models;
using ClimaApi.Hubs;
using Microsoft.EntityFrameworkCore;
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

        // Evaluar reglas dinámicamente
        var reglas = await _context.ReglasAlerta
            .Where(r => r.Estado && r.TipoSensor.ToLower() == sensor.TipoSensor.ToLower() &&
                        lectura.Valor >= r.ValorMinimo && lectura.Valor <= r.ValorMaximo)
            .ToListAsync();

        if (!reglas.Any()) return; // Condiciones normales, no hay alerta que generar

        // Obtener la regla de mayor prioridad
        var reglaCritica = reglas.OrderByDescending(r => r.NivelPeligro == "Rojo" ? 4 : r.NivelPeligro == "Naranja" ? 3 : r.NivelPeligro == "Amarillo" ? 2 : 1).First();

        string nivelRiesgo = reglaCritica.NivelPeligro;
        string mensaje = reglaCritica.Mensaje;
        string fenomeno = reglaCritica.TipoFenomeno ?? string.Empty;

        // Registrar la alerta
        var nuevaAlerta = new Alerta
        {
            ComunidadId = sensor.ComunidadId,
            SensorId = sensor.Id,
            ReglaAlertaId = reglaCritica.Id,
            NivelRiesgo = nivelRiesgo,
            Mensaje = mensaje,
            ValorRegistrado = lectura.Valor,
            Umbral = reglaCritica.ValorMaximo,
            FechaHora = DateTime.UtcNow,
            Fenomeno = fenomeno,
            Estado = "Activa"
        };
        _context.Alertas.Add(nuevaAlerta);
        await _context.SaveChangesAsync();

        // Registrar en Historial de Eventos
        var historial = new HistorialEvento
        {
            ComunidadId = sensor.ComunidadId,
            SensorId = sensor.Id,
            TipoFenomeno = fenomeno,
            Descripcion = mensaje,
            NivelGravedad = nivelRiesgo,
            Valor = lectura.Valor,
            Estado = "Activo",
            FechaHora = DateTime.UtcNow
        };
        _context.HistorialEventos.Add(historial);
        await _context.SaveChangesAsync();

        // Notificar en tiempo real mediante SignalR
        await _hubContext.Clients.All.SendAsync("RecibirLectura", new
        {
            AlertaId = nuevaAlerta.Id,
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