using ClimaApi.Data;
using ClimaApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BCrypt.Net;

namespace ClimaApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthController(ApplicationDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Email == request.Email && u.Estado);
        
        if (usuario == null || !BCrypt.Net.BCrypt.Verify(request.Password, usuario.PasswordHash))
        {
            return Unauthorized(new { message = "Credenciales incorrectas o usuario inactivo." });
        }

        usuario.UltimoAcceso = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var token = GenerarJwtToken(usuario);
        
        // Registro de auditoría
        _context.BitacoraAcciones.Add(new BitacoraAccion
        {
            UsuarioId = usuario.Id,
            Accion = "Login",
            Entidad = "Auth",
            Identificador = usuario.Email,
            Descripcion = "Inicio de sesión exitoso",
            FechaHora = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        return Ok(new
        {
            token,
            usuario = new
            {
                usuario.Id,
                usuario.Nombre,
                usuario.Email,
                usuario.Rol
            }
        });
    }

    [HttpPost("register-admin")] // Endpoint inicial para crear el primer admin si es necesario
    public async Task<IActionResult> RegisterAdmin([FromBody] RegisterRequest request)
    {
        if (await _context.Usuarios.AnyAsync(u => u.Email == request.Email))
            return BadRequest(new { message = "El email ya está registrado." });

        var admin = new Usuario
        {
            Nombre = request.Nombre,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Rol = "Administrador",
            Estado = true,
            FechaCreacion = DateTime.UtcNow
        };

        _context.Usuarios.Add(admin);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Administrador creado con éxito." });
    }

    private string GenerarJwtToken(Usuario usuario)
    {
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, usuario.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new Claim(ClaimTypes.Name, usuario.Nombre),
            new Claim(ClaimTypes.Role, usuario.Rol)
        };

        var expireDays = _configuration.GetValue<int>("Jwt:ExpireDays");

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(expireDays > 0 ? expireDays : 1),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class RegisterRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
