using Microsoft.EntityFrameworkCore;
using ClimaApi.Models;

namespace ClimaApi.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Usuario> Usuarios { get; set; }
    public DbSet<Comunidad> Comunidades { get; set; }
    public DbSet<Sensor> Sensores { get; set; }
    public DbSet<Lectura> Lecturas { get; set; }
    public DbSet<ReglaAlerta> ReglasAlerta { get; set; }
    public DbSet<Alerta> Alertas { get; set; }
    public DbSet<HistorialEvento> HistorialEventos { get; set; }
    public DbSet<BitacoraAccion> BitacoraAcciones { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<Sensor>()
            .HasOne(s => s.Comunidad)
            .WithMany(c => c.Sensores)
            .HasForeignKey(s => s.ComunidadId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Alerta>()
            .HasOne(a => a.Comunidad)
            .WithMany()
            .HasForeignKey(a => a.ComunidadId)
            .OnDelete(DeleteBehavior.Restrict);
            
        modelBuilder.Entity<Alerta>()
            .HasOne(a => a.Sensor)
            .WithMany()
            .HasForeignKey(a => a.SensorId)
            .OnDelete(DeleteBehavior.Restrict);
            
        modelBuilder.Entity<Alerta>()
            .HasOne(a => a.ReglaAlerta)
            .WithMany()
            .HasForeignKey(a => a.ReglaAlertaId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Alerta>()
            .HasOne(a => a.UsuarioAtendio)
            .WithMany()
            .HasForeignKey(a => a.UsuarioAtendioId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Alerta>()
            .HasOne(a => a.UsuarioCerro)
            .WithMany()
            .HasForeignKey(a => a.UsuarioCerroId)
            .OnDelete(DeleteBehavior.Restrict);
            
        modelBuilder.Entity<HistorialEvento>()
            .HasOne(h => h.Comunidad)
            .WithMany()
            .HasForeignKey(h => h.ComunidadId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<HistorialEvento>()
            .HasOne(h => h.Sensor)
            .WithMany()
            .HasForeignKey(h => h.SensorId)
            .OnDelete(DeleteBehavior.Restrict);
            
        modelBuilder.Entity<HistorialEvento>()
            .HasOne(h => h.UsuarioResponsable)
            .WithMany()
            .HasForeignKey(h => h.UsuarioResponsableId)
            .OnDelete(DeleteBehavior.Restrict);
            
        modelBuilder.Entity<Lectura>()
            .HasOne(l => l.Sensor)
            .WithMany(s => s.Lecturas)
            .HasForeignKey(l => l.SensorId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}