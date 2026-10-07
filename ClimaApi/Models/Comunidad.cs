namespace ClimaApi.Models;

public class Comunidad
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Municipio { get; set; } = string.Empty;
    public string Departamento { get; set; } = string.Empty;
    public string Pais { get; set; } = string.Empty;
    public string CoordenadasGeograficas { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public bool Estado { get; set; } = true;

    public ICollection<Sensor>? Sensores { get; set; }
}
