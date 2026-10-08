namespace ClimaApi.Models;

public class HistorialEvento
{
    public int Id { get; set; }
    public DateTime FechaHora { get; set; } = DateTime.UtcNow;
    public int ComunidadId { get; set; }
    public int SensorId { get; set; }
    public string TipoFenomeno { get; set; } = string.Empty; // Inundacion, Sequia, etc.
    public string NivelGravedad { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public int? UsuarioResponsableId { get; set; }

    [System.Text.Json.Serialization.JsonIgnore]
    public Comunidad? Comunidad { get; set; }
    [System.Text.Json.Serialization.JsonIgnore]
    public Sensor? Sensor { get; set; }
    [System.Text.Json.Serialization.JsonIgnore]
    public Usuario? UsuarioResponsable { get; set; }
}