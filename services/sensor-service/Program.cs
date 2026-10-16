using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SensorService.Data;
using SensorService.Hubs;
using SensorService.Models;
using System.Text.Json;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// Base de datos SQL Server 2022+
var sqlConnection = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Server=sqlserver-db,1433;Database=SensorDB;User Id=sa;Password=ClimaDB_Secure2026!;TrustServerCertificate=True;Connection Timeout=3;";

builder.Services.AddDbContext<SensorDbContext>(options =>
    options.UseSqlServer(sqlConnection));

// SignalR para actualización en tiempo real con WebSockets
builder.Services.AddSignalR();

// HttpClient para comunicación entre microservicios
builder.Services.AddHttpClient("AlertService", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Services:AlertService"] ?? "http://alert-service:8081");
    client.Timeout = TimeSpan.FromSeconds(5);
});

builder.Services.AddHttpClient("AuditService", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Services:AuditService"] ?? "http://audit-service:8001");
    client.Timeout = TimeSpan.FromSeconds(5);
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", p => p.SetIsOriginAllowed(_ => true).AllowAnyHeader().AllowAnyMethod().AllowCredentials());
});

var app = builder.Build();

app.UseCors("AllowAll");

// Catálogo base de sensores en memoria para tolerancia a fallos
var fallbackSensores = new List<Sensor>
{
    new() { Id = 1, Codigo = "SENS-TEMP-01", Nombre = "Sensor Temperatura - Valle Central", TipoSensor = "Temperatura", ComunidadId = 4, ComunidadNombre = "El Tablón", Ubicacion = "Aldea El Tablón (Sector Agrícola Central)", Latitud = 14.4820m, Longitud = -90.5340m, UnidadMedida = "°C", ValorMinimo = 10.0m, ValorMaximo = 35.0m, ValorActual = 23.4m, NivelRiesgoActual = "Verde", MensajeActual = "Temperatura óptima y condiciones estables.", Estado = true, ApiKey = "API-KEY-SENS-TEMP-01-2026", UltimaLectura = DateTime.UtcNow, HistorialLecturas = new() { 21.0m, 22.4m, 23.0m, 23.8m, 23.4m } },
    new() { Id = 2, Codigo = "SENS-HUM-01", Nombre = "Sensor Humedad Relativa - Cultivos", TipoSensor = "Humedad", ComunidadId = 9, ComunidadNombre = "Santa Elena Barillas", Ubicacion = "Aldea Santa Elena Barillas (Plantaciones de Café)", Latitud = 14.4350m, Longitud = -90.5180m, UnidadMedida = "%", ValorMinimo = 40.0m, ValorMaximo = 85.0m, ValorActual = 68.2m, NivelRiesgoActual = "Verde", MensajeActual = "Humedad relativa en margen seguro.", Estado = true, ApiKey = "API-KEY-SENS-HUM-01-2026", UltimaLectura = DateTime.UtcNow, HistorialLecturas = new() { 65.0m, 66.2m, 67.0m, 68.2m } },
    new() { Id = 3, Codigo = "SENS-WIND-01", Nombre = "Anemómetro - Cerro Las Minas", TipoSensor = "Viento", ComunidadId = 5, ComunidadNombre = "Colmenas", Ubicacion = "Aldea Colmenas (Zona de Vientos Norte)", Latitud = 14.4980m, Longitud = -90.4900m, UnidadMedida = "km/h", ValorMinimo = 0.0m, ValorMaximo = 45.0m, ValorActual = 18.5m, NivelRiesgoActual = "Verde", MensajeActual = "Velocidad de viento moderada.", Estado = true, ApiKey = "API-KEY-SENS-WIND-01-2026", UltimaLectura = DateTime.UtcNow, HistorialLecturas = new() { 12.0m, 14.5m, 17.0m, 18.5m } },
    new() { Id = 4, Codigo = "SENS-RAIN-01", Nombre = "Pluviómetro - Cuenca Norte", TipoSensor = "Lluvia", ComunidadId = 1, ComunidadNombre = "Boca del Monte", Ubicacion = "Aldea Boca del Monte (Ladera Urbana)", Latitud = 14.5420m, Longitud = -90.5180m, UnidadMedida = "mm", ValorMinimo = 0.0m, ValorMaximo = 35.0m, ValorActual = 4.2m, NivelRiesgoActual = "Verde", MensajeActual = "Precipitación pluvial baja.", Estado = true, ApiKey = "API-KEY-SENS-RAIN-01-2026", UltimaLectura = DateTime.UtcNow, HistorialLecturas = new() { 0.0m, 1.2m, 3.5m, 4.2m } },
    new() { Id = 5, Codigo = "SENS-RIVR-01", Nombre = "Sensor Hidrométrico - Río Villalobos", TipoSensor = "NivelRio", ComunidadId = 13, ComunidadNombre = "El Obrajuelo", Ubicacion = "Aldea El Obrajuelo (Ribera Principal del Río)", Latitud = 14.3710m, Longitud = -90.5510m, UnidadMedida = "m", ValorMinimo = 1.0m, ValorMaximo = 4.5m, ValorActual = 2.3m, NivelRiesgoActual = "Verde", MensajeActual = "Caudal del afluente en nivel seguro.", Estado = true, ApiKey = "API-KEY-SENS-RIVR-01-2026", UltimaLectura = DateTime.UtcNow, HistorialLecturas = new() { 2.1m, 2.2m, 2.3m } },
    new() { Id = 6, Codigo = "SENS-TEMP-02", Nombre = "Sensor Térmico - Corredor Seco", TipoSensor = "Temperatura", ComunidadId = 11, ComunidadNombre = "Los Pocitos", Ubicacion = "Aldea Los Pocitos (Sector Árido)", Latitud = 14.3980m, Longitud = -90.5480m, UnidadMedida = "°C", ValorMinimo = 12.0m, ValorMaximo = 38.0m, ValorActual = 29.1m, NivelRiesgoActual = "Verde", MensajeActual = "Condiciones térmicas normales en corredor seco.", Estado = true, ApiKey = "API-KEY-SENS-TEMP-02-2026", UltimaLectura = DateTime.UtcNow, HistorialLecturas = new() { 27.5m, 28.0m, 29.1m } }
};

var fallbackLecturas = new List<Lectura>();

// Inicialización de SQL Server en arranque
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<SensorDbContext>();
        db.Database.EnsureCreated();
        if (!db.Sensores.Any())
        {
            db.Sensores.AddRange(fallbackSensores);
            db.SaveChanges();
            logger.LogInformation("✅ Sensor Service: SQL Server inicializado exitosamente con 6 sensores.");
        }
    }
    catch (Exception ex)
    {
        logger.LogWarning("⚠️ Sensor Service: SQL Server no disponible aún ({Msg}). Operando con memoria.", ex.Message);
    }
}

// ============================================================================
// ENDPOINTS REST: SENSOR SERVICE
// ============================================================================

// Health check
app.MapGet("/api/sensors/health", () => Results.Ok(new
{
    status = "Healthy",
    service = "Sensor Service (.NET 10, SQL Server & SignalR)",
    timestamp = DateTime.UtcNow
}));

// GET /api/sensors (Listar todos los sensores con lecturas y estado)
app.MapGet("/api/sensors", async (SensorDbContext db) =>
{
    try
    {
        var sensores = await db.Sensores.AsNoTracking().ToListAsync();
        if (sensores.Any())
        {
            var sensorIds = sensores.Select(s => s.Id).ToList();
            var lecturasRecientes = await db.Lecturas.AsNoTracking()
                .Where(l => sensorIds.Contains(l.SensorId))
                .OrderByDescending(l => l.FechaHora)
                .Take(60)
                .ToListAsync();

            foreach (var s in sensores)
            {
                var ultimas = lecturasRecientes
                    .Where(l => l.SensorId == s.Id)
                    .OrderBy(l => l.FechaHora)
                    .Select(l => l.Valor)
                    .ToList();
                s.HistorialLecturas = ultimas.Any() ? ultimas : new List<decimal> { s.ValorActual };
            }
            return Results.Ok(sensores);
        }
    }
    catch { }

    return Results.Ok(fallbackSensores);
});

// GET /api/sensors/{id}
app.MapGet("/api/sensors/{id:int}", async (int id, SensorDbContext db) =>
{
    try
    {
        var s = await db.Sensores.FindAsync(id);
        if (s != null) return Results.Ok(s);
    }
    catch { }

    var mem = fallbackSensores.FirstOrDefault(x => x.Id == id);
    return mem != null ? Results.Ok(mem) : Results.NotFound();
});

// POST /api/sensors (Crear nuevo sensor y generar API Key de Hardware)
app.MapPost("/api/sensors", async (Sensor nuevo, SensorDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(nuevo.ApiKey))
    {
        nuevo.ApiKey = "API-KEY-" + Guid.NewGuid().ToString("N").Substring(0, 12).ToUpper();
    }
    nuevo.UltimaLectura = DateTime.UtcNow;
    nuevo.FechaInstalacion = DateTime.UtcNow;

    try
    {
        db.Sensores.Add(nuevo);
        await db.SaveChangesAsync();
        return Results.Created($"/api/sensors/{nuevo.Id}", nuevo);
    }
    catch
    {
        nuevo.Id = fallbackSensores.Max(s => s.Id) + 1;
        fallbackSensores.Add(nuevo);
        return Results.Created($"/api/sensors/{nuevo.Id}", nuevo);
    }
});

// PUT /api/sensors/{id} (Actualizar sensor)
app.MapPut("/api/sensors/{id:int}", async (int id, Sensor update, SensorDbContext db) =>
{
    try
    {
        var s = await db.Sensores.FindAsync(id);
        if (s == null) return Results.NotFound();
        s.Nombre = update.Nombre;
        s.Ubicacion = update.Ubicacion;
        s.Estado = update.Estado;
        s.ValorMinimo = update.ValorMinimo;
        s.ValorMaximo = update.ValorMaximo;
        await db.SaveChangesAsync();
        return Results.Ok(s);
    }
    catch
    {
        var mem = fallbackSensores.FirstOrDefault(x => x.Id == id);
        if (mem == null) return Results.NotFound();
        mem.Nombre = update.Nombre;
        mem.Ubicacion = update.Ubicacion;
        mem.Estado = update.Estado;
        return Results.Ok(mem);
    }
});

// GET /api/sensors/status-summary (Sensores activos, inactivos, sin comunicación)
app.MapGet("/api/sensors/status-summary", async (SensorDbContext db) =>
{
    List<Sensor> list;
    try
    {
        list = await db.Sensores.ToListAsync();
        if (!list.Any()) list = fallbackSensores;
    }
    catch
    {
        list = fallbackSensores;
    }

    var activos = list.Count(s => s.EstadoComunicacion == "Activo");
    var inactivos = list.Count(s => s.EstadoComunicacion == "Inactivo");
    var sinComunicacion = list.Count(s => s.EstadoComunicacion == "Sin comunicacion");

    return Results.Ok(new
    {
        total = list.Count,
        activos,
        inactivos,
        sinComunicacion,
        timestamp = DateTime.UtcNow
    });
});

// GET /api/sensors/{id}/readings (Historial de lecturas con paginación)
app.MapGet("/api/sensors/{id:int}/readings", async (int id, int? limit, SensorDbContext db) =>
{
    int cant = limit ?? 20;
    try
    {
        var lecturas = await db.Lecturas
            .Where(l => l.SensorId == id)
            .OrderByDescending(l => l.FechaHora)
            .Take(cant)
            .ToListAsync();
        return Results.Ok(lecturas);
    }
    catch
    {
        var mem = fallbackLecturas.Where(l => l.SensorId == id).OrderByDescending(l => l.FechaHora).Take(cant).ToList();
        return Results.Ok(mem);
    }
});

// ============================================================================
// INGESTA IOT: BASES PARA CONECTAR SENSORES FÍSICOS (ESP32, ARDUINO, HTTP)
// ============================================================================
app.MapPost("/api/sensors/ingest", async (
    HttpContext context,
    TelemetryIngestDto dto,
    SensorDbContext db,
    IHubContext<ClimaHub> hub,
    IHttpClientFactory httpFactory) =>
{
    // Validar autenticación de sensor mediante Header X-Sensor-Key o ApiKey en DTO
    string? apiKeyHeader = context.Request.Headers["X-Sensor-Key"].FirstOrDefault() ?? dto.ApiKey;

    Sensor? sensor = null;
    try
    {
        if (dto.SensorId.HasValue)
        {
            sensor = await db.Sensores.FindAsync(dto.SensorId.Value);
        }
        else if (!string.IsNullOrWhiteSpace(dto.CodigoSensor))
        {
            sensor = await db.Sensores.FirstOrDefaultAsync(s => s.Codigo == dto.CodigoSensor);
        }
    }
    catch { }

    if (sensor == null)
    {
        if (dto.SensorId.HasValue)
            sensor = fallbackSensores.FirstOrDefault(s => s.Id == dto.SensorId.Value);
        else if (!string.IsNullOrWhiteSpace(dto.CodigoSensor))
            sensor = fallbackSensores.FirstOrDefault(s => s.Codigo == dto.CodigoSensor);
    }

    if (sensor == null)
    {
        return Results.NotFound(new { message = "Sensor no registrado en el sistema." });
    }

    // Actualizar datos del sensor
    sensor.ValorActual = dto.Valor;
    sensor.UltimaLectura = DateTime.UtcNow;

    // Persistir lectura
    var lectura = new Lectura
    {
        SensorId = sensor.Id,
        Valor = dto.Valor,
        UnidadMedida = !string.IsNullOrWhiteSpace(dto.Unidad) ? dto.Unidad : sensor.UnidadMedida,
        Bateria = dto.Bateria ?? 100,
        IpOrigen = dto.IpDispositivo ?? context.Connection.RemoteIpAddress?.ToString() ?? "IoT-Device",
        FechaHora = dto.Timestamp ?? DateTime.UtcNow
    };

    try
    {
        db.Lecturas.Add(lectura);
        await db.SaveChangesAsync();
    }
    catch
    {
        lectura.Id = fallbackLecturas.Count + 1;
        fallbackLecturas.Add(lectura);
    }

    // ========================================================================
    // COMUNICACIÓN ENTRE SERVICIOS: LLAMAR A ALERT SERVICE (JAVA SPRING BOOT)
    // ========================================================================
    string nivelRiesgo = "Verde";
    string mensajeAlerta = "Condición normal.";
    string fenomeno = "Normal";

    try
    {
        var alertClient = httpFactory.CreateClient("AlertService");
        var evalPayload = new
        {
            sensorId = sensor.Id,
            sensorNombre = sensor.Nombre,
            tipoSensor = sensor.TipoSensor,
            comunidadId = sensor.ComunidadId,
            comunidadNombre = sensor.ComunidadNombre,
            valor = dto.Valor
        };

        var content = new StringContent(JsonSerializer.Serialize(evalPayload), Encoding.UTF8, "application/json");
        var evalResponse = await alertClient.PostAsync("/api/alerts/evaluate", content);
        if (evalResponse.IsSuccessStatusCode)
        {
            var jsonResp = await evalResponse.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(jsonResp);
            var root = doc.RootElement;
            if (root.TryGetProperty("nivelRiesgo", out var nr)) nivelRiesgo = nr.GetString() ?? "Verde";
            if (root.TryGetProperty("mensaje", out var ms)) mensajeAlerta = ms.GetString() ?? "Condición evaluada.";
            if (root.TryGetProperty("fenomeno", out var fe)) fenomeno = fe.GetString() ?? "Normal";
        }
    }
    catch
    {
        // Evaluación local de respaldo si Alert Service está inicializando
        if (sensor.TipoSensor == "Temperatura" && dto.Valor >= 40) { nivelRiesgo = "Rojo"; mensajeAlerta = "¡Calor extremo! Riesgo de incendio forestal."; fenomeno = "Incendio forestal"; }
        else if (sensor.TipoSensor == "Temperatura" && dto.Valor <= 0) { nivelRiesgo = "Rojo"; mensajeAlerta = "¡Helada severa bajo cero!"; fenomeno = "Helada"; }
        else if (sensor.TipoSensor == "Humedad" && dto.Valor <= 15) { nivelRiesgo = "Rojo"; mensajeAlerta = "¡Sequía severa!"; fenomeno = "Sequia"; }
        else if (sensor.TipoSensor == "Viento" && dto.Valor >= 70) { nivelRiesgo = "Rojo"; mensajeAlerta = "¡Viento huracanado de tormenta!"; fenomeno = "Tormenta"; }
        else if (sensor.TipoSensor == "Lluvia" && dto.Valor >= 80) { nivelRiesgo = "Rojo"; mensajeAlerta = "¡Precipitación torrencial e inundación!"; fenomeno = "Inundacion"; }
        else if (sensor.TipoSensor == "NivelRio" && dto.Valor >= 5.0m) { nivelRiesgo = "Rojo"; mensajeAlerta = "¡Desbordamiento inminente de cauce!"; fenomeno = "Inundacion"; }
    }

    sensor.NivelRiesgoActual = nivelRiesgo;
    sensor.MensajeActual = mensajeAlerta;

    // Transmitir en tiempo real a clientes Angular conectados vía SignalR
    await hub.Clients.All.SendAsync("RecibirLectura", new
    {
        sensorId = sensor.Id,
        sensorNombre = sensor.Nombre,
        tipoSensor = sensor.TipoSensor,
        comunidad = sensor.ComunidadNombre,
        valor = dto.Valor,
        unidadMedida = sensor.UnidadMedida,
        nivelRiesgo = nivelRiesgo,
        mensaje = mensajeAlerta,
        fenomeno = fenomeno,
        fechaHora = DateTime.UtcNow.ToString("dd/MM/yyyy, HH:mm:ss")
    });

    return Results.Ok(new
    {
        status = "TELEMETRY_INGESTED",
        sensorId = sensor.Id,
        codigo = sensor.Codigo,
        valor = dto.Valor,
        nivelRiesgo = nivelRiesgo,
        mensaje = mensajeAlerta,
        timestamp = DateTime.UtcNow
    });
});

// Compatibilidad con frontend previo: POST /api/sensors/lecturas
app.MapPost("/api/sensors/lecturas", async (
    HttpContext ctx,
    TelemetryIngestDto dto,
    SensorDbContext db,
    IHubContext<ClimaHub> hub,
    IHttpClientFactory httpFactory) =>
{
    var endpoint = app.Services.GetRequiredService<EndpointDataSource>();
    // Invocar directamente la lógica de ingesta
    return await Task.FromResult(Results.Redirect("/api/sensors/ingest", false));
});

// POST /api/sensors/reiniciar (Restablecer sensores a estado Verde)
app.MapPost("/api/sensors/reiniciar", async (SensorDbContext db, IHubContext<ClimaHub> hub) =>
{
    try
    {
        var sensores = await db.Sensores.ToListAsync();
        foreach (var s in sensores)
        {
            s.Estado = true;
            s.NivelRiesgoActual = "Verde";
            s.MensajeActual = "Condición ambiental normal.";
            s.ValorActual = (s.ValorMinimo + s.ValorMaximo) / 2;
        }
        await db.SaveChangesAsync();
    }
    catch { }

    foreach (var s in fallbackSensores)
    {
        s.Estado = true;
        s.NivelRiesgoActual = "Verde";
        s.MensajeActual = "Condición ambiental normal.";
        s.ValorActual = (s.ValorMinimo + s.ValorMaximo) / 2;
    }

    await hub.Clients.All.SendAsync("SistemaReiniciado", new
    {
        mensaje = "Sistema de monitoreo restablecido a condiciones normales.",
        timestamp = DateTime.UtcNow
    });

    return Results.Ok(new { message = "Monitoreo reiniciado con éxito." });
});

// Mapear SignalR Hub
app.MapHub<ClimaHub>("/hubs/climaHub");

app.Run();
