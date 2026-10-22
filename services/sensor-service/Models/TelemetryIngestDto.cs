namespace SensorService.Models;

public class TelemetryIngestDto
{
    public string? CodigoSensor { get; set; }
    public int? SensorId { get; set; }
    public decimal Valor { get; set; }
    public string? Unidad { get; set; }
    public int? Bateria { get; set; }
    public string? IpDispositivo { get; set; }
    public DateTime? Timestamp { get; set; }
    public string? ApiKey { get; set; }
}
