namespace ClimaApi.Models;

public class Alerta
{
    public int Id { get; set; }
    public int ComunidadId { get; set; }
    public int SensorId { get; set; }
    public int? ReglaAlertaId { get; set; }
    public string NivelRiesgo { get; set; } = "Verde"; // Verde, Amarillo, Naranja, Rojo
    public string Fenomeno { get; set; } = string.Empty;
    public decimal ValorRegistrado { get; set; }
    public decimal? Umbral { get; set; }
    public string Mensaje { get; set; } = string.Empty;
    public string Estado { get; set; } = "Activa"; // Activa, Atendida, Cerrada
    public DateTime FechaHora { get; set; } = DateTime.UtcNow;
    public int? UsuarioAtendioId { get; set; }
    public int? UsuarioCerroId { get; set; }

    public Comunidad? Comunidad { get; set; }
    public Sensor? Sensor { get; set; }
    public ReglaAlerta? ReglaAlerta { get; set; }
    public Usuario? UsuarioAtendio { get; set; }
    public Usuario? UsuarioCerro { get; set; }
}