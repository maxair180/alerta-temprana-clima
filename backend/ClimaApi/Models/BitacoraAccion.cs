namespace ClimaApi.Models;

public class BitacoraAccion
{
    public long Id { get; set; }
    public int? UsuarioId { get; set; }
    public string AccionRealizada { get; set; } = string.Empty;
    public string? Detalles { get; set; }
    public DateTime FechaHora { get; set; } = DateTime.UtcNow;

    public Usuario? Usuario { get; set; }
}