using Microsoft.EntityFrameworkCore;
using ClimaApi.Models;

namespace ClimaApi.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Usuario> Usuarios { get; set; }
    public DbSet<Sensor> Sensores { get; set; }
    public DbSet<Lectura> Lecturas { get; set; }
    public DbSet<Alerta> Alertas { get; set; }
    public DbSet<HistorialEvento> HistorialEventos { get; set; }
    public DbSet<BitacoraAccion> BitacoraAcciones { get; set; }
}