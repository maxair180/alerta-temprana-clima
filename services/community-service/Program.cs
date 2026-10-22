using CommunityService.Data;
using CommunityService.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// Base de Datos PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("PostgresConnection") 
    ?? "Host=postgres-db;Port=5432;Database=community_db;Username=postgres;Password=ClimaSafePostgres2026!";

builder.Services.AddDbContext<CommunityDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

app.UseCors("AllowAll");

// Seed de Comunidades en memoria como respaldo y para inicialización
var defaultAldeas = new List<Comunidad>
{
    new() { Id = 1, Nombre = "Boca del Monte", Municipio = "Villa Canales", Departamento = "Guatemala", Pais = "Guatemala", Coordenadas = "14.5420,-90.5180", Latitud = 14.5420m, Longitud = -90.5180m, Descripcion = "Zona urbana-norte de alta densidad poblacional y laderas de riesgo.", Zona = "Norte", Estado = true, CantidadSensores = 1 },
    new() { Id = 2, Nombre = "El Porvenir", Municipio = "Villa Canales", Departamento = "Guatemala", Pais = "Guatemala", Coordenadas = "14.5290,-90.5140", Latitud = 14.5290m, Longitud = -90.5140m, Descripcion = "Área semi-urbana con cuencas pluviales hacia el lago.", Zona = "Norte", Estado = true, CantidadSensores = 0 },
    new() { Id = 3, Nombre = "Chichimecas", Municipio = "Villa Canales", Departamento = "Guatemala", Pais = "Guatemala", Coordenadas = "14.5120,-90.5050", Latitud = 14.5120m, Longitud = -90.5050m, Descripcion = "Sector rural montañoso con vulnerabilidad a deslizamientos.", Zona = "Norte", Estado = true, CantidadSensores = 0 },
    new() { Id = 4, Nombre = "El Tablón", Municipio = "Villa Canales", Departamento = "Guatemala", Pais = "Guatemala", Coordenadas = "14.4820,-90.5340", Latitud = 14.4820m, Longitud = -90.5340m, Descripcion = "Valle agrícola central de alta producción hortícola.", Zona = "Norte", Estado = true, CantidadSensores = 1 },
    new() { Id = 5, Nombre = "Colmenas", Municipio = "Villa Canales", Departamento = "Guatemala", Pais = "Guatemala", Coordenadas = "14.4980,-90.4900", Latitud = 14.4980m, Longitud = -90.4900m, Descripcion = "Comunidad montañosa con microclima templado y vientos fuertes.", Zona = "Norte", Estado = true, CantidadSensores = 1 },
    new() { Id = 6, Nombre = "El Zapote", Municipio = "Villa Canales", Departamento = "Guatemala", Pais = "Guatemala", Coordenadas = "14.4600,-90.5280", Latitud = 14.4600m, Longitud = -90.5280m, Descripcion = "Zona de colinas y quebradas con afluentes pluviales.", Zona = "Centro", Estado = true, CantidadSensores = 0 },
    new() { Id = 7, Nombre = "El Durazno", Municipio = "Villa Canales", Departamento = "Guatemala", Pais = "Guatemala", Coordenadas = "14.4500,-90.5120", Latitud = 14.4500m, Longitud = -90.5120m, Descripcion = "Sector rural boscoso propicio a bajas térmicas y heladas.", Zona = "Centro", Estado = true, CantidadSensores = 0 },
    new() { Id = 8, Nombre = "Santa Rosita", Municipio = "Villa Canales", Departamento = "Guatemala", Pais = "Guatemala", Coordenadas = "14.4420,-90.5010", Latitud = 14.4420m, Longitud = -90.5010m, Descripcion = "Área intermedia de plantaciones agrícolas y cuenca media.", Zona = "Centro", Estado = true, CantidadSensores = 0 },
    new() { Id = 9, Nombre = "Santa Elena Barillas", Municipio = "Villa Canales", Departamento = "Guatemala", Pais = "Guatemala", Coordenadas = "14.4350,-90.5180", Latitud = 14.4350m, Longitud = -90.5180m, Descripcion = "Faldas del Volcán de Pacaya, cafetales y mirador sur.", Zona = "Centro", Estado = true, CantidadSensores = 1 },
    new() { Id = 10, Nombre = "Los Dolores", Municipio = "Villa Canales", Departamento = "Guatemala", Pais = "Guatemala", Coordenadas = "14.4150,-90.5320", Latitud = 14.4150m, Longitud = -90.5320m, Descripcion = "Valle cálido y seco susceptible a incendios y sequías.", Zona = "Sur", Estado = true, CantidadSensores = 0 },
    new() { Id = 11, Nombre = "Los Pocitos", Municipio = "Villa Canales", Departamento = "Guatemala", Pais = "Guatemala", Coordenadas = "14.3980,-90.5480", Latitud = 14.3980m, Longitud = -90.5480m, Descripcion = "Corredor seco y de altas temperaturas en época de estiaje.", Zona = "Sur", Estado = true, CantidadSensores = 1 },
    new() { Id = 12, Nombre = "El Jocotillo", Municipio = "Villa Canales", Departamento = "Guatemala", Pais = "Guatemala", Coordenadas = "14.3820,-90.5620", Latitud = 14.3820m, Longitud = -90.5620m, Descripcion = "Comunidad sureña fronteriza con actividad ganadera y piñera.", Zona = "Sur", Estado = true, CantidadSensores = 0 },
    new() { Id = 13, Nombre = "El Obrajuelo", Municipio = "Villa Canales", Departamento = "Guatemala", Pais = "Guatemala", Coordenadas = "14.3710,-90.5510", Latitud = 14.3710m, Longitud = -90.5510m, Descripcion = "Ribera de afluentes y reservas hídricas del río Villalobos.", Zona = "Sur", Estado = true, CantidadSensores = 1 }
};

// Intentar inicializar Postgres en arranque
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<CommunityDbContext>();
        db.Database.EnsureCreated();
        if (!db.Comunidades.Any())
        {
            db.Comunidades.AddRange(defaultAldeas);
            db.SaveChanges();
            logger.LogInformation("✅ Community Service: Base de datos Postgres inicializada con las 13 Aldeas.");
        }
    }
    catch (Exception ex)
    {
        logger.LogWarning("⚠️ Community Service: No se pudo conectar a Postgres en arranque ({Msg}). Se usará catálogo en memoria.", ex.Message);
    }
}

// ============================================================================
// ENDPOINTS REST: COMMUNITY SERVICE
// ============================================================================

// Health check
app.MapGet("/api/communities/health", () => Results.Ok(new
{
    status = "Healthy",
    service = "Community Service (.NET 10 & PostgreSQL)",
    timestamp = DateTime.UtcNow
}));

// GET /api/communities (Listar comunidades)
app.MapGet("/api/communities", async (CommunityDbContext db) =>
{
    try
    {
        var list = await db.Comunidades.OrderBy(c => c.Id).ToListAsync();
        if (list.Any())
        {
            // Mapear sensores conocidos
            foreach (var c in list)
            {
                if (c.Id == 1 || c.Id == 4 || c.Id == 5 || c.Id == 9 || c.Id == 11 || c.Id == 13)
                    c.CantidadSensores = 1;
            }
            return Results.Ok(list);
        }
    }
    catch { }
    return Results.Ok(defaultAldeas);
});

// GET /api/communities/{id} (Detalle de comunidad)
app.MapGet("/api/communities/{id:int}", async (int id, CommunityDbContext db) =>
{
    try
    {
        var item = await db.Comunidades.FindAsync(id);
        if (item != null) return Results.Ok(item);
    }
    catch { }

    var fallback = defaultAldeas.FirstOrDefault(c => c.Id == id);
    return fallback != null ? Results.Ok(fallback) : Results.NotFound(new { message = $"Comunidad con ID {id} no encontrada." });
});

// POST /api/communities (Crear nueva comunidad)
app.MapPost("/api/communities", async (Comunidad nueva, CommunityDbContext db) =>
{
    try
    {
        db.Comunidades.Add(nueva);
        await db.SaveChangesAsync();
        return Results.Created($"/api/communities/{nueva.Id}", nueva);
    }
    catch
    {
        nueva.Id = defaultAldeas.Max(c => c.Id) + 1;
        defaultAldeas.Add(nueva);
        return Results.Created($"/api/communities/{nueva.Id}", nueva);
    }
});

// PUT /api/communities/{id} (Actualizar comunidad)
app.MapPut("/api/communities/{id:int}", async (int id, Comunidad updateData, CommunityDbContext db) =>
{
    try
    {
        var item = await db.Comunidades.FindAsync(id);
        if (item == null) return Results.NotFound();

        item.Nombre = updateData.Nombre;
        item.Descripcion = updateData.Descripcion;
        item.Coordenadas = updateData.Coordenadas;
        item.Latitud = updateData.Latitud;
        item.Longitud = updateData.Longitud;
        item.Zona = updateData.Zona;
        item.Estado = updateData.Estado;

        await db.SaveChangesAsync();
        return Results.Ok(item);
    }
    catch
    {
        var mem = defaultAldeas.FirstOrDefault(c => c.Id == id);
        if (mem == null) return Results.NotFound();
        mem.Nombre = updateData.Nombre;
        mem.Descripcion = updateData.Descripcion;
        mem.Estado = updateData.Estado;
        return Results.Ok(mem);
    }
});

// GET /api/communities/geodata (Información geográfica para el mapa)
app.MapGet("/api/communities/geodata", () =>
{
    var geoFeatures = defaultAldeas.Select(a => new
    {
        type = "Feature",
        properties = new
        {
            id = a.Id,
            nombre = a.Nombre,
            zona = a.Zona,
            sensores = a.CantidadSensores,
            municipio = "Villa Canales"
        },
        geometry = new
        {
            type = "Point",
            coordinates = new[] { a.Longitud, a.Latitud }
        }
    });

    return Results.Ok(new
    {
        type = "FeatureCollection",
        features = geoFeatures
    });
});

app.Run();
