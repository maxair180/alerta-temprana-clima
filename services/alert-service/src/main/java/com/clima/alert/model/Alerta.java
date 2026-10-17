package com.clima.alert.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "alertas")
public class Alerta {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "comunidad_id", nullable = false)
    private Integer comunidadId;

    @Column(name = "sensor_id", nullable = false)
    private Integer sensorId;

    @Column(name = "sensor_nombre", nullable = false, length = 120)
    private String sensorNombre;

    @Column(name = "tipo_sensor", nullable = false, length = 50)
    private String tipoSensor;

    @Column(name = "nivel_riesgo", nullable = false, length = 20)
    private String nivelRiesgo; // Verde, Amarillo, Naranja, Rojo

    @Column(name = "mensaje", nullable = false, length = 500)
    private String mensaje;

    @Column(name = "valor_registrado", nullable = false)
    private BigDecimal valorRegistrado;

    @Column(name = "umbral", nullable = false)
    private BigDecimal umbral;

    @Column(name = "fenomeno", nullable = false, length = 50)
    private String fenomeno;

    @Column(name = "atendida", nullable = false)
    private Boolean atendida = false;

    @Column(name = "usuario_atendio_id")
    private Integer usuarioAtendioId;

    @Column(name = "fecha_hora", nullable = false)
    private LocalDateTime fechaHora = LocalDateTime.now();

    @Column(name = "fecha_atencion")
    private LocalDateTime fechaAtencion;

    @Column(name = "estado", nullable = false, length = 30)
    private String estado = "Activa";

    public Alerta() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getComunidadId() { return comunidadId; }
    public void setComunidadId(Integer comunidadId) { this.comunidadId = comunidadId; }

    public Integer getSensorId() { return sensorId; }
    public void setSensorId(Integer sensorId) { this.sensorId = sensorId; }

    public String getSensorNombre() { return sensorNombre; }
    public void setSensorNombre(String sensorNombre) { this.sensorNombre = sensorNombre; }

    public String getTipoSensor() { return tipoSensor; }
    public void setTipoSensor(String tipoSensor) { this.tipoSensor = tipoSensor; }

    public String getNivelRiesgo() { return nivelRiesgo; }
    public void setNivelRiesgo(String nivelRiesgo) { this.nivelRiesgo = nivelRiesgo; }

    public String getMensaje() { return mensaje; }
    public void setMensaje(String mensaje) { this.mensaje = mensaje; }

    public BigDecimal getValorRegistrado() { return valorRegistrado; }
    public void setValorRegistrado(BigDecimal valorRegistrado) { this.valorRegistrado = valorRegistrado; }

    public BigDecimal getUmbral() { return umbral; }
    public void setUmbral(BigDecimal umbral) { this.umbral = umbral; }

    public String getFenomeno() { return fenomeno; }
    public void setFenomeno(String fenomeno) { this.fenomeno = fenomeno; }

    public Boolean getAtendida() { return atendida; }
    public void setAtendida(Boolean atendida) { this.atendida = atendida; }

    public Integer getUsuarioAtendioId() { return usuarioAtendioId; }
    public void setUsuarioAtendioId(Integer usuarioAtendioId) { this.usuarioAtendioId = usuarioAtendioId; }

    public LocalDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }

    public LocalDateTime getFechaAtencion() { return fechaAtencion; }
    public void setFechaAtencion(LocalDateTime fechaAtencion) { this.fechaAtencion = fechaAtencion; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
}
