namespace ClimaApi.Models;

public class HistorialEvento
{
    public int Id { get; set; }
    public int AlertaId { get; set; }
    public string TipoFenomeno { get; set; } = string.Empty; // Inundacion, Sequia, Tormenta, Helada, IncendioForestal
    public DateTime FechaHora { get; set; } = DateTime.UtcNow;

    public Alerta? Alerta { get; set; }
}