namespace ClimaApi.Models;

public class ReglaAlerta
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string TipoSensor { get; set; } = string.Empty; 
    public decimal ValorMinimo { get; set; }
    public decimal ValorMaximo { get; set; }
    public string NivelPeligro { get; set; } = string.Empty; 
    public string TipoFenomeno { get; set; } = string.Empty; 
    public string Mensaje { get; set; } = string.Empty;
    public bool Estado { get; set; } = true;
}
