using Microsoft.EntityFrameworkCore;
using CommunityService.Models;

namespace CommunityService.Data;

public class CommunityDbContext : DbContext
{
    public CommunityDbContext(DbContextOptions<CommunityDbContext> options) : base(options)
    {
    }

    public DbSet<Comunidad> Comunidades => Set<Comunidad>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Comunidad>().ToTable("comunidades");
    }
}
