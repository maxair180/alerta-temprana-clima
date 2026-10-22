using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SensorService.Models;

[Table("Lecturas")]
public class Lectura
{
    [Key]
    public long Id { get; set; }

    public int SensorId { get; set; }

    public decimal Valor { get; set; }

    [MaxLength(20)]
    public string UnidadMedida { get; set; } = string.Empty;

    public int? Bateria { get; set; } = 100;

    [MaxLength(45)]
    public string? IpOrigen { get; set; }

    public DateTime FechaHora { get; set; } = DateTime.UtcNow;
}
