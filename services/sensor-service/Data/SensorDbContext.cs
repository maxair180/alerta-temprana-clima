using Microsoft.EntityFrameworkCore;
using SensorService.Models;

namespace SensorService.Data;

public class SensorDbContext : DbContext
{
    public SensorDbContext(DbContextOptions<SensorDbContext> options) : base(options)
    {
    }

    public DbSet<Sensor> Sensores => Set<Sensor>();
    public DbSet<Lectura> Lecturas => Set<Lectura>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Sensor>().ToTable("Sensores");
        modelBuilder.Entity<Lectura>().ToTable("Lecturas");
    }
}
