using ClimaApi.Data;
using ClimaApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace ClimaApi.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class HistorialEventosController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public HistorialEventosController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetHistorial()
    {
        var eventos = await _context.HistorialEventos
            .Include(h => h.Comunidad)
            .Include(h => h.Sensor)
            .OrderByDescending(h => h.FechaHora)
            .Take(100)
            .ToListAsync();

        return Ok(eventos.Select(e => new 
        {
            id = e.Id,
            alertaId = e.Id,
            sensorNombre = e.Sensor?.Nombre ?? "Desconocido",
            comunidad = e.Comunidad?.Nombre ?? "Desconocida",
            tipoFenomeno = e.TipoFenomeno,
            descripcion = e.Descripcion,
            nivelGravedad = e.NivelGravedad,
            fechaHora = e.FechaHora.ToString("dd/MM/yyyy HH:mm:ss")
        }));
    }
}
