using ClimaApi.Data;
using ClimaApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClimaApi.Controllers;

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
    public async Task<ActionResult<IEnumerable<Alerta>>> GetAlertas()
    {
        return await _context.Alertas
            .Include(a => a.Sensor)
            .OrderByDescending(a => a.FechaHora)
            .Take(50)
            .ToListAsync();
    }

    [HttpGet("historial")]
    public async Task<ActionResult<IEnumerable<HistorialEvento>>> GetHistorial()
    {
        return await _context.HistorialEventos
            .Include(h => h.Alerta)
            .ThenInclude(a => a!.Sensor)
            .OrderByDescending(h => h.FechaHora)
            .ToListAsync();
    }
}