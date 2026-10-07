using ClimaApi.Data;
using ClimaApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace ClimaApi.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ReglasAlertaController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ReglasAlertaController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ReglaAlerta>>> GetReglas()
    {
        return await _context.ReglasAlerta.ToListAsync();
    }

    [Authorize(Roles = "Administrador")]
    [HttpPost]
    public async Task<ActionResult<ReglaAlerta>> CreateRegla(ReglaAlerta regla)
    {
        _context.ReglasAlerta.Add(regla);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetReglas), new { id = regla.Id }, regla);
    }

    [Authorize(Roles = "Administrador")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateRegla(int id, ReglaAlerta regla)
    {
        if (id != regla.Id) return BadRequest();
        _context.Entry(regla).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
