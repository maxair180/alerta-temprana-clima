namespace ClimaApi.Models;

public class Alerta
{
    public int Id { get; set; }
    public int SensorId { get; set; }
    public string NivelRiesgo { get; set; } = "Verde"; // Verde, Amarillo, Naranja, Rojo
    public string Mensaje { get; set; } = string.Empty;
    public decimal ValorRegistrado { get; set; }
    public bool Atendida { get; set; } = false;
    public int? UsuarioAtendioId { get; set; }
    public DateTime FechaHora { get; set; } = DateTime.UtcNow;
    public DateTime? FechaAtencion { get; set; }

    public Sensor? Sensor { get; set; }
}