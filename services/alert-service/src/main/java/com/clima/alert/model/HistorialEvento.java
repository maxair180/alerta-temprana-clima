package com.clima.alert.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "historial_eventos")
public class HistorialEvento {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "alerta_id")
    private Long alertaId;

    @Column(name = "comunidad_id", nullable = false)
    private Integer comunidadId;

    @Column(name = "sensor_id", nullable = false)
    private Integer sensorId;

    @Column(name = "tipo_fenomeno", nullable = false, length = 50)
    private String tipoFenomeno; // Inundacion, Sequia, Tormenta, Helada, Incendio forestal

    @Column(name = "descripcion", nullable = false, length = 500)
    private String descripcion;

    @Column(name = "nivel_gravedad", nullable = false, length = 20)
    private String nivelGravedad;

    @Column(name = "valor", nullable = false)
    private BigDecimal valor;

    @Column(name = "fecha_hora", nullable = false)
    private LocalDateTime fechaHora = LocalDateTime.now();

    @Column(name = "estado", nullable = false, length = 30)
    private String estado = "Activo";

    public HistorialEvento() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getAlertaId() { return alertaId; }
    public void setAlertaId(Long alertaId) { this.alertaId = alertaId; }

    public Integer getComunidadId() { return comunidadId; }
    public void setComunidadId(Integer comunidadId) { this.comunidadId = comunidadId; }

    public Integer getSensorId() { return sensorId; }
    public void setSensorId(Integer sensorId) { this.sensorId = sensorId; }

    public String getTipoFenomeno() { return tipoFenomeno; }
    public void setTipoFenomeno(String tipoFenomeno) { this.tipoFenomeno = tipoFenomeno; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public String getNivelGravedad() { return nivelGravedad; }
    public void setNivelGravedad(String nivelGravedad) { this.nivelGravedad = nivelGravedad; }

    public BigDecimal getValor() { return valor; }
    public void setValor(BigDecimal valor) { this.valor = valor; }

    public LocalDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
}
