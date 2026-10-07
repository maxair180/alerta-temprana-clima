using ClimaApi.Data;
using ClimaApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace ClimaApi.Controllers;

[Authorize(Roles = "Administrador")]
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
            .ToListAsync();

        var result = logs.Select(b => new {
            id = b.Id,
            usuarioNombre = b.Usuario != null ? b.Usuario.Nombre : "Sistema Automático",
            accionRealizada = b.Accion,
            modulo = b.Entidad,
            detalles = b.Descripcion,
            direccionIP = "127.0.0.1", // Mock o extraer del HttpContext si es necesario
            fechaHora = b.FechaHora.ToString("dd/MM/yyyy HH:mm:ss")
        });

        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<BitacoraAccion>> PostBitacora([FromBody] BitacoraDto dto)
    {
        var bitacora = new BitacoraAccion
        {
            UsuarioId = dto.UsuarioId > 0 ? dto.UsuarioId : null,
            Accion = dto.Accion,
            Entidad = dto.Entidad,
            Identificador = dto.Identificador,
            Descripcion = dto.Descripcion,
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
    public string Accion { get; set; } = string.Empty;
    public string Entidad { get; set; } = string.Empty;
    public string Identificador { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
}
