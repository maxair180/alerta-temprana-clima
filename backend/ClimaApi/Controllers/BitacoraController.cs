using ClimaApi.Data;
using ClimaApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClimaApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BitacoraController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public BitacoraController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetBitacora()
    {
        var logs = await _context.BitacoraAcciones
            .Include(b => b.Usuario)
            .OrderByDescending(b => b.FechaHora)
            .Take(50)
            .Select(b => new {
                b.Id,
                UsuarioNombre = b.Usuario != null ? b.Usuario.Nombre : "Sistema Automático",
                b.AccionRealizada,
                b.Modulo,
                b.Detalles,
                b.DireccionIP,
                FechaHora = b.FechaHora.ToString("dd/MM/yyyy HH:mm:ss")
            })
            .ToListAsync();

        return Ok(logs);
    }

    [HttpPost]
    public async Task<ActionResult<BitacoraAccion>> PostBitacora([FromBody] BitacoraDto dto)
    {
        var bitacora = new BitacoraAccion
        {
            UsuarioId = dto.UsuarioId > 0 ? dto.UsuarioId : null,
            AccionRealizada = dto.AccionRealizada,
            Modulo = dto.Modulo,
            Detalles = dto.Detalles,
            DireccionIP = dto.DireccionIP ?? "192.168.1.10",
            FechaHora = DateTime.UtcNow
        };

        _context.BitacoraAcciones.Add(bitacora);
        await _context.SaveChangesAsync();

        return Ok(bitacora);
    }
}

public class BitacoraDto
{
    public int? UsuarioId { get; set; }
    public string AccionRealizada { get; set; } = string.Empty;
    public string Modulo { get; set; } = string.Empty;
    public string Detalles { get; set; } = string.Empty;
    public string? DireccionIP { get; set; }
}
