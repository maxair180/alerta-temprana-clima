using ClimaApi.Data;
using ClimaApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace ClimaApi.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ComunidadesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ComunidadesController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Comunidad>>> GetComunidades()
    {
        return await _context.Comunidades.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Comunidad>> GetComunidad(int id)
    {
        var comunidad = await _context.Comunidades.FindAsync(id);
        if (comunidad == null) return NotFound();
        return comunidad;
    }

    [Authorize(Roles = "Administrador")]
    [HttpPost]
    public async Task<ActionResult<Comunidad>> CreateComunidad(Comunidad comunidad)
    {
        _context.Comunidades.Add(comunidad);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetComunidad), new { id = comunidad.Id }, comunidad);
    }

    [Authorize(Roles = "Administrador")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateComunidad(int id, Comunidad comunidad)
    {
        if (id != comunidad.Id) return BadRequest();
        _context.Entry(comunidad).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
