using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CommunityService.Models;

[Table("comunidades")]
public class Comunidad
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [MaxLength(120)]
    [Column("nombre")]
    public string Nombre { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [Column("municipio")]
    public string Municipio { get; set; } = "Villa Canales";

    [Required]
    [MaxLength(100)]
    [Column("departamento")]
    public string Departamento { get; set; } = "Guatemala";

    [Required]
    [MaxLength(100)]
    [Column("pais")]
    public string Pais { get; set; } = "Guatemala";

    [Required]
    [MaxLength(60)]
    [Column("coordenadas")]
    public string Coordenadas { get; set; } = string.Empty;

    [Column("latitud")]
    public decimal Latitud { get; set; }

    [Column("longitud")]
    public decimal Longitud { get; set; }

    [Column("descripcion")]
    public string? Descripcion { get; set; }

    [Column("zona")]
    public string Zona { get; set; } = "Centro";

    [Column("estado")]
    public bool Estado { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Calculado lógicamente para respuesta REST
    [NotMapped]
    public int CantidadSensores { get; set; } = 0;
}
