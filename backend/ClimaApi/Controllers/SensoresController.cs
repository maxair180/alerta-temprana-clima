using ClimaApi.Data;
using ClimaApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClimaApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SensoresController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public SensoresController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Sensor>>> GetSensores()
    {
        return await _context.Sensores.ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<Sensor>> CreateSensor(Sensor sensor)
    {
        _context.Sensores.Add(sensor);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetSensores), new { id = sensor.Id }, sensor);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSensor(int id, Sensor sensor)
    {
        if (id != sensor.Id) return BadRequest();
        _context.Entry(sensor).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }
}