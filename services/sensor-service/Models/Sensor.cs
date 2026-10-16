using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SensorService.Models;

[Table("Sensores")]
public class Sensor
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Codigo { get; set; } = string.Empty;

    [Required]
    [MaxLength(120)]
    public string Nombre { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string TipoSensor { get; set; } = "Temperatura"; // Temperatura, Humedad, Viento, Lluvia, NivelRio

    public int ComunidadId { get; set; }

    [MaxLength(100)]
    public string ComunidadNombre { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Ubicacion { get; set; } = string.Empty;

    public decimal? Latitud { get; set; }
    public decimal? Longitud { get; set; }

    [MaxLength(20)]
    public string UnidadMedida { get; set; } = "°C";

    public decimal ValorMinimo { get; set; }
    public decimal ValorMaximo { get; set; }
    public decimal ValorActual { get; set; } = 0.0m;

    [MaxLength(20)]
    public string NivelRiesgoActual { get; set; } = "Verde";

    [MaxLength(300)]
    public string MensajeActual { get; set; } = "Condición ambiental normal.";

    public bool Estado { get; set; } = true;

    [MaxLength(100)]
    public string ApiKey { get; set; } = Guid.NewGuid().ToString("N");

    public DateTime UltimaLectura { get; set; } = DateTime.UtcNow;
    public DateTime FechaInstalacion { get; set; } = DateTime.UtcNow;

    [NotMapped]
    public string EstadoComunicacion
    {
        get
        {
            if (!Estado) return "Inactivo";
            var diferenciaMinutos = (DateTime.UtcNow - UltimaLectura).TotalMinutes;
            if (diferenciaMinutos <= 5) return "Activo";
            return "Sin comunicacion";
        }
    }

    [NotMapped]
    public List<decimal> HistorialLecturas { get; set; } = new();
}
