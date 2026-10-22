namespace ClimaApi.Models;

public class Sensor
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Codigo { get; set; } = string.Empty;
    public string TipoSensor { get; set; } = string.Empty; 
    public int ComunidadId { get; set; }
    public string Ubicacion { get; set; } = string.Empty;
    public string UnidadMedida { get; set; } = string.Empty;
    public bool Estado { get; set; } = true;
    public DateTime FechaInstalacion { get; set; } = DateTime.UtcNow.AddHours(-6);
    public string Descripcion { get; set; } = string.Empty;

    public Comunidad? Comunidad { get; set; }
    public ICollection<Lectura>? Lecturas { get; set; }
}
