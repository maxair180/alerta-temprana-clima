package com.clima.alert.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "reglas_alerta")
public class ReglaAlerta {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tipo_sensor", nullable = false)
    private String tipoSensor;

    @Column(name = "nivel_peligro", nullable = false)
    private String nivelPeligro; // Verde, Amarillo, Naranja, Rojo

    @Column(name = "valor_minimo", nullable = false)
    private BigDecimal valorMinimo;

    @Column(name = "valor_maximo", nullable = false)
    private BigDecimal valorMaximo;

    @Column(name = "tipo_fenomeno", nullable = false)
    private String tipoFenomeno; // Inundacion, Sequia, Tormenta, Helada, Incendio forestal

    @Column(name = "mensaje", nullable = false, length = 500)
    private String mensaje;

    @Column(name = "estado", nullable = false)
    private Boolean estado = true;

    public ReglaAlerta() {}

    public ReglaAlerta(String tipoSensor, String nivelPeligro, BigDecimal valorMinimo, BigDecimal valorMaximo, String tipoFenomeno, String mensaje) {
        this.tipoSensor = tipoSensor;
        this.nivelPeligro = nivelPeligro;
        this.valorMinimo = valorMinimo;
        this.valorMaximo = valorMaximo;
        this.tipoFenomeno = tipoFenomeno;
        this.mensaje = mensaje;
        this.estado = true;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTipoSensor() { return tipoSensor; }
    public void setTipoSensor(String tipoSensor) { this.tipoSensor = tipoSensor; }

    public String getNivelPeligro() { return nivelPeligro; }
    public void setNivelPeligro(String nivelPeligro) { this.nivelPeligro = nivelPeligro; }

    public BigDecimal getValorMinimo() { return valorMinimo; }
    public void setValorMinimo(BigDecimal valorMinimo) { this.valorMinimo = valorMinimo; }

    public BigDecimal getValorMaximo() { return valorMaximo; }
    public void setValorMaximo(BigDecimal valorMaximo) { this.valorMaximo = valorMaximo; }

    public String getTipoFenomeno() { return tipoFenomeno; }
    public void setTipoFenomeno(String tipoFenomeno) { this.tipoFenomeno = tipoFenomeno; }

    public String getMensaje() { return mensaje; }
    public void setMensaje(String mensaje) { this.mensaje = mensaje; }

    public Boolean getEstado() { return estado; }
    public void setEstado(Boolean estado) { this.estado = estado; }
}
