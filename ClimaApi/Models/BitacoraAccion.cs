namespace ClimaApi.Models;

public class BitacoraAccion
{
    public int Id { get; set; }
    public int? UsuarioId { get; set; }
    public string Accion { get; set; } = string.Empty; 
    public DateTime FechaHora { get; set; } = DateTime.UtcNow;
    public string Entidad { get; set; } = string.Empty; 
    public string Identificador { get; set; } = string.Empty; 
    public string Descripcion { get; set; } = string.Empty;

    public Usuario? Usuario { get; set; }
}