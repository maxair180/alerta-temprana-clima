namespace ClimaApi.Models;

public class Lectura
{
    public long Id { get; set; }
    public int SensorId { get; set; }
    public decimal Valor { get; set; }
    public string Unidad { get; set; } = string.Empty;
    public DateTime FechaHora { get; set; } = DateTime.UtcNow;
    public bool EstadoSensor { get; set; } = true;

    public Sensor? Sensor { get; set; }
}