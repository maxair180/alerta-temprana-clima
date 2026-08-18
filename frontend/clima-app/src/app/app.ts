import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClimaService, SensorModel, AlertaModel, HistorialEventoModel, BitacoraModel } from './services/clima.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  public pestanaActiva: 'dashboard' | 'alertas' | 'historial' | 'admin' | 'bitacora' = 'dashboard';

  public sensores: SensorModel[] = [];
  public alertas: AlertaModel[] = [];
  public historial: HistorialEventoModel[] = [];
  public bitacora: BitacoraModel[] = [];
  public alertaEmergente: AlertaModel | null = null;
  public conectadoSignalR: boolean = false;
  public sonidoHabilitado: boolean = true;

  // Filtros
  public filtroNivelAlerta: string = 'TODOS';
  public filtroFenomeno: string = 'TODOS';
  public sensorSeleccionadoGraficoId: number = 1;

  // Estado general de la comunidad
  public estadoComunidad: 'Normal' | 'Precaucion' | 'Alerta' | 'Emergencia' = 'Normal';

  // Modal para agregar sensor
  public modalAgregarSensor: boolean = false;
  public nuevoSensor: {
    nombre: string;
    tipoSensor: 'Temperatura' | 'Humedad' | 'Viento' | 'Lluvia' | 'NivelRio';
    ubicacion: string;
    unidadMedida: string;
    valorMinimo: number;
    valorMaximo: number;
  } = {
    nombre: '',
    tipoSensor: 'Temperatura',
    ubicacion: '',
    unidadMedida: '°C',
    valorMinimo: 10,
    valorMaximo: 35
  };

  private subs: Subscription = new Subscription();

  constructor(public climaService: ClimaService) {}

  ngOnInit() {
    this.subs.add(
      this.climaService.sensores$.subscribe(sensores => {
        this.sensores = sensores;
        this.calcularEstadoComunidad();
      })
    );

    this.subs.add(
      this.climaService.alertas$.subscribe(alertas => {
        this.alertas = alertas;
      })
    );

    this.subs.add(
      this.climaService.historial$.subscribe(historial => {
        this.historial = historial;
      })
    );

    this.subs.add(
      this.climaService.bitacora$.subscribe(bitacora => {
        this.bitacora = bitacora;
      })
    );

    this.subs.add(
      this.climaService.alertaEmergente$.subscribe(alerta => {
        this.alertaEmergente = alerta;
      })
    );

    this.subs.add(
      this.climaService.conectadoSignalR$.subscribe(conectado => {
        this.conectadoSignalR = conectado;
      })
    );

    this.subs.add(
      this.climaService.sonidoHabilitado$.subscribe(habilitado => {
        this.sonidoHabilitado = habilitado;
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  private calcularEstadoComunidad() {
    const algunRojo = this.sensores.some(s => s.estado && s.nivelRiesgoActual === 'Rojo');
    if (algunRojo) {
      this.estadoComunidad = 'Emergencia';
      return;
    }
    const algunNaranja = this.sensores.some(s => s.estado && s.nivelRiesgoActual === 'Naranja');
    if (algunNaranja) {
      this.estadoComunidad = 'Alerta';
      return;
    }
    const algunAmarillo = this.sensores.some(s => s.estado && s.nivelRiesgoActual === 'Amarillo');
    if (algunAmarillo) {
      this.estadoComunidad = 'Precaucion';
      return;
    }
    this.estadoComunidad = 'Normal';
  }

  public get sensorGrafico(): SensorModel | undefined {
    return this.sensores.find(s => s.id === this.sensorSeleccionadoGraficoId) || this.sensores[0];
  }

  public toggleSonido() {
    this.climaService.toggleSonido();
  }

  public toggleSensor(id: number) {
    this.climaService.toggleEstadoSensor(id);
  }

  public atenderAlerta(id: number) {
    this.climaService.atenderAlerta(id);
  }

  public cerrarAlertaEmergente() {
    this.alertaEmergente = null;
  }

  public reiniciarSistema() {
    if (confirm('¿Estás seguro de reiniciar el sistema de monitoreo? Esto restablecerá todos los sensores al estado normal y limpiará las alertas activas según el procedimiento sp_ReiniciarMonitoreo.')) {
      this.climaService.reiniciarSistemaMonitoreo();
    }
  }

  public simularEvento(tipo: 'Inundacion' | 'Incendio' | 'Tormenta' | 'Helada' | 'Sequia') {
    this.climaService.simularEventoExtremo(tipo);
  }

  public get alertasFiltradas(): AlertaModel[] {
    if (this.filtroNivelAlerta === 'TODOS') return this.alertas;
    return this.alertas.filter(a => a.nivelRiesgo === this.filtroNivelAlerta);
  }

  public get historialFiltrado(): HistorialEventoModel[] {
    if (this.filtroFenomeno === 'TODOS') return this.historial;
    return this.historial.filter(h => h.tipoFenomeno === this.filtroFenomeno);
  }

  // Generador de puntos SVG para el gráfico de evolución temporal
  public generarPuntosSvg(lecturas: number[], ancho: number = 600, alto: number = 180): string {
    if (!lecturas || lecturas.length < 2) return '';
    const min = Math.min(...lecturas) * 0.9;
    const max = Math.max(...lecturas) * 1.1 || 1;
    const rango = max - min || 1;

    const puntos = lecturas.map((val, idx) => {
      const x = (idx / (lecturas.length - 1)) * ancho;
      const y = alto - ((val - min) / rango) * (alto - 30) - 15;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return puntos.join(' ');
  }

  public agregarNuevoSensor() {
    if (!this.nuevoSensor.nombre || !this.nuevoSensor.ubicacion) {
      alert('Por favor completa todos los campos del sensor.');
      return;
    }

    let unidad = '°C';
    if (this.nuevoSensor.tipoSensor === 'Humedad') unidad = '%';
    if (this.nuevoSensor.tipoSensor === 'Viento') unidad = 'km/h';
    if (this.nuevoSensor.tipoSensor === 'Lluvia') unidad = 'mm';
    if (this.nuevoSensor.tipoSensor === 'NivelRio') unidad = 'm';

    const nuevo: SensorModel = {
      id: Date.now(),
      nombre: this.nuevoSensor.nombre,
      codigoIdentificador: `SENS-${this.nuevoSensor.tipoSensor.toUpperCase().substring(0, 4)}-0${this.sensores.length + 1}`,
      ubicacion: this.nuevoSensor.ubicacion,
      latitud: 14.6300 + (Math.random() - 0.5) * 0.02,
      longitud: -90.5050 + (Math.random() - 0.5) * 0.02,
      tipoSensor: this.nuevoSensor.tipoSensor,
      unidadMedida: unidad,
      valorMinimo: this.nuevoSensor.valorMinimo,
      valorMaximo: this.nuevoSensor.valorMaximo,
      valorActual: (this.nuevoSensor.valorMinimo + this.nuevoSensor.valorMaximo) / 2,
      estado: true,
      nivelRiesgoActual: 'Verde',
      mensajeActual: 'Sensor configurado e instalado.',
      fechaInstalacion: new Date().toISOString(),
      historialLecturas: [this.nuevoSensor.valorMinimo, (this.nuevoSensor.valorMinimo + this.nuevoSensor.valorMaximo) / 2]
    };

    this.sensores.push(nuevo);
    this.climaService.sensores$.next([...this.sensores]);
    this.climaService.registrarEnBitacora(
      'Nuevo Sensor Agregado',
      'Sensores',
      `Sensor ${nuevo.nombre} (${nuevo.codigoIdentificador}) registrado exitosamente.`
    );

    this.modalAgregarSensor = false;
    this.nuevoSensor = {
      nombre: '',
      tipoSensor: 'Temperatura',
      ubicacion: '',
      unidadMedida: '°C',
      valorMinimo: 10,
      valorMaximo: 35
    };
  }
}
