namespace ClimaApi.Models;

public class Sensor
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Ubicacion { get; set; } = string.Empty;
    public string TipoSensor { get; set; } = string.Empty; // Temperatura, Humedad, Viento, Lluvia, NivelRio
    public bool Estado { get; set; } = true;
    public DateTime FechaInstalacion { get; set; } = DateTime.UtcNow;
}