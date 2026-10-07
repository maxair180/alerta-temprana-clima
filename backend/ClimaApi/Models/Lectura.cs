namespace ClimaApi.Models;

public class Lectura
{
    public long Id { get; set; }
    public int SensorId { get; set; }
    public decimal Valor { get; set; }
    public DateTime FechaHora { get; set; } = DateTime.UtcNow;

    public Sensor? Sensor { get; set; }
}