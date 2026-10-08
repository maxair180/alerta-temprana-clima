using ClimaApi.Data;
using ClimaApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace ClimaApi.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AlertasController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AlertasController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetAlertas()
    {
        var alertas = await _context.Alertas
            .Include(a => a.Sensor)
            .Include(a => a.Comunidad)
            .OrderByDescending(a => a.FechaHora)
            .Take(50)
            .ToListAsync();

        return Ok(alertas.Select(a => new
        {
            id = a.Id,
            sensorId = a.SensorId,
            sensorNombre = a.Sensor?.Nombre ?? "Desconocido",
            comunidad = a.Comunidad?.Nombre ?? "Desconocida",
            tipoSensor = a.Sensor?.TipoSensor ?? "Desconocido",
            nivelRiesgo = a.NivelRiesgo,
            mensaje = a.Mensaje,
            valorRegistrado = a.ValorRegistrado,
            unidadMedida = a.Sensor?.UnidadMedida ?? "",
            atendida = a.Estado == "Atendida",
            fechaHora = a.FechaHora.ToString("dd/MM/yyyy HH:mm:ss")
        }));
    }

    [HttpGet("historial")]
    public async Task<ActionResult<IEnumerable<HistorialEvento>>> GetHistorial()
    {
        return await _context.HistorialEventos
            .Include(h => h.Sensor)
            .Include(h => h.Comunidad)
            .OrderByDescending(h => h.FechaHora)
            .ToListAsync();
    }

    [HttpPut("{id}/atender")]
    [Authorize(Roles = "Administrador,Operador")]
    public async Task<IActionResult> AtenderAlerta(int id, [FromBody] int usuarioId)
    {
        var alerta = await _context.Alertas.FindAsync(id);
        if (alerta == null)
            return NotFound();

        alerta.Estado = "Atendida";
        alerta.UsuarioAtendioId = usuarioId > 0 ? usuarioId : null;

        await _context.SaveChangesAsync();
        return NoContent();
    }
}