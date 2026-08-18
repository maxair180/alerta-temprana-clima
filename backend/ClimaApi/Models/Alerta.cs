namespace ClimaApi.Models;

public class Alerta
{
    public int Id { get; set; }
    public int SensorId { get; set; }
    public string NivelRiesgo { get; set; } = "Verde"; // Verde, Amarillo, Naranja, Rojo
    public string Mensaje { get; set; } = string.Empty;
    public decimal ValorRegistrado { get; set; }
    public DateTime FechaHora { get; set; } = DateTime.UtcNow;

    public Sensor? Sensor { get; set; }
}