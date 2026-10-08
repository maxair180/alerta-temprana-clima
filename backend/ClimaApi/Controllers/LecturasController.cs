using ClimaApi.Data;
using ClimaApi.Models;
using ClimaApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace ClimaApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LecturasController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly AlertaService _alertaService;

    public LecturasController(ApplicationDbContext context, AlertaService alertaService)
    {
        _context = context;
        _alertaService = alertaService;
    }

    [Authorize]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Lectura>>> GetLecturas([FromQuery] int? sensorId)
    {
        var query = _context.Lecturas.AsQueryable();
        if (sensorId.HasValue)
        {
            query = query.Where(l => l.SensorId == sensorId.Value);
        }
        return await query.OrderByDescending(l => l.FechaHora).Take(100).ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<Lectura>> CreateLectura(Lectura lectura)
    {
        lectura.FechaHora = DateTime.UtcNow.AddHours(-6);
        _context.Lecturas.Add(lectura);
        await _context.SaveChangesAsync();

        // Evaluar reglas de alerta dinámicamente
        await _alertaService.EvaluarLecturaAsync(lectura);

        return Ok(lectura);
    }
}
